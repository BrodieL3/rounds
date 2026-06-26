/**
 * Hand-seed sample events + happy hours for the Boston/Cambridge beta (P2 / #7).
 *
 * Populates the server-only `events` and `happyHours` collections so the "tonight"
 * experience is real before the P4 scraper exists. Venue identity/coords/cohort are
 * REAL (from assets/venues.json, the source of truth per ADR 007); the events
 * themselves are SAMPLE data (clearly marked source:'manual-seed') spread across the
 * next 7 days so tonight + this week always have content.
 *
 * Idempotent: events use the deterministic id from lib/events/event-id (the same
 * contract the P4 scraper will use), so re-running upserts instead of duplicating —
 * which also proves the dedup contract end to end. Happy hours key on venue+weekday.
 *
 * Auth: Application Default Credentials for prod. Run with NODE, never bun
 * (gcp-metadata bug — see memory):
 *   Dry run (DEFAULT — writes nothing, just reports what it would write):
 *     node scripts/events-seed.js
 *     node scripts/events-seed.js --limit 10
 *   Apply to production (rounds-8d89f):
 *     node scripts/events-seed.js --apply
 *   Against the local Firestore emulator (no ADC needed):
 *     FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/events-seed.js --apply
 *
 * NOTE: timestamps are built in the machine's local timezone; run from
 * America/New_York so localDate matches Boston's calendar day.
 */

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const venueSeed = require('../assets/venues.json');
const { buildEventId } = require('../lib/events/event-id');
const { buildEventPayload, buildHappyHourPayload } = require('../lib/events/event-payload');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'rounds-8d89f';
const APPLY = process.argv.includes('--apply');
const USING_EMULATOR = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const BATCH_LIMIT = 450; // under Firestore's 500-op cap, with headroom.

const limitArg = process.argv.indexOf('--limit');
const VENUE_LIMIT = limitArg !== -1 ? Number(process.argv[limitArg + 1]) : 30;

// Real venues from the seed; sample happenings layered on top.
const EVENT_TEMPLATES = [
  { title: 'Trivia Night', category: 'open_mic', hour: 20 },
  { title: 'Live Music', category: 'live_music', hour: 21 },
  { title: 'Resident DJ Set', category: 'dj_set', hour: 22 },
  { title: 'Open Mic', category: 'open_mic', hour: 19 },
  { title: '$1 Oyster Hour', category: 'one_time_promo', hour: 18 },
];
const HH_SUMMARIES = ['$5 wells, $3 drafts', 'half-price apps', '$6 cocktails', '2-for-1 drafts'];

function allBetaVenues(seed) {
  const out = [];
  for (const city of Object.values(seed?.cities || {})) {
    for (const venue of city?.venues || []) {
      if (venue?.id && venue?.name && venue?.cohort) out.push(venue);
    }
  }
  return out;
}

function atLocal(daysFromNow, hour) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function localDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Build the full set of intended writes from the curated venues.
function planWrites(venues) {
  const events = [];
  const happyHours = [];
  venues.forEach((venue, i) => {
    // Two events per venue, on different days, so the week stays populated.
    for (const [dayOffset, tplIndex] of [[i % 7, i % EVENT_TEMPLATES.length], [(i + 3) % 7, (i + 2) % EVENT_TEMPLATES.length]]) {
      const tpl = EVENT_TEMPLATES[tplIndex];
      const startTime = atLocal(dayOffset, tpl.hour);
      const localDate = localDateStr(startTime);
      const payload = buildEventPayload({
        venue,
        title: tpl.title,
        category: tpl.category,
        startTime: startTime.toISOString(),
        localDate,
        source: 'manual-seed',
      });
      const id = buildEventId({ venueId: venue.id, localDate, title: tpl.title });
      events.push({ id, payload });
    }
    // One recurring happy hour per venue.
    const dayOfWeek = i % 7;
    happyHours.push({
      id: `${venue.id}_hh_${dayOfWeek}`,
      payload: buildHappyHourPayload({
        venue,
        dayOfWeek,
        startLocal: '17:00',
        endLocal: '19:00',
        dealSummary: HH_SUMMARIES[i % HH_SUMMARIES.length],
      }),
    });
  });
  return { events, happyHours };
}

async function commitAll(db, collectionName, docs) {
  for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    for (const { id, payload } of docs.slice(i, i + BATCH_LIMIT)) {
      batch.set(db.collection(collectionName).doc(id), payload);
    }
    await batch.commit();
  }
}

async function main() {
  const venues = allBetaVenues(venueSeed).slice(0, VENUE_LIMIT);
  const { events, happyHours } = planWrites(venues);

  console.log(`Planned: ${events.length} events + ${happyHours.length} happy hours across ${venues.length} venues.`);
  console.log('Sample events:');
  for (const { id, payload } of events.slice(0, 6)) {
    console.log(`  ${id}  ${payload.venueName} — ${payload.title} (${payload.category}) ${payload.localDate}`);
  }

  if (!APPLY) {
    console.log('\nDRY RUN — nothing written. Re-run with --apply to write.');
    return;
  }

  initializeApp(USING_EMULATOR ? { projectId: PROJECT_ID } : { projectId: PROJECT_ID, credential: applicationDefault() });
  const db = getFirestore();
  await commitAll(db, 'events', events);
  await commitAll(db, 'happyHours', happyHours);
  console.log(`\nApplied to ${USING_EMULATOR ? 'EMULATOR' : PROJECT_ID}: ${events.length} events, ${happyHours.length} happy hours (idempotent upsert).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
