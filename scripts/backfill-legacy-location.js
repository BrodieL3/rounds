/**
 * Backfill legacy Rating/Post location fields (ADR 007).
 *
 * Before ADR 007, Ratings and their Post projections were stamped
 * `city: profile.city || 'nyc'` and carried no `metro`. Discover now queries by
 * `metro`, so these legacy docs are invisible and mislabeled. This script
 * resolves each doc's REAL location from its venue — `assets/venues.json` is the
 * source of truth per ADR 007 — and writes the correct `{ city, metro }`.
 *
 * It is IDEMPOTENT: a doc already carrying the city+metro that P0 would stamp
 * today is left untouched. Safe to run repeatedly.
 *
 * Three outcomes per doc:
 *   - fix      → venue still exists in the seed; relabel to its real city+metro.
 *   - orphan   → venueId is no longer in the Boston+Cambridge seed (e.g. an old
 *                NYC test venue). Reported; only deleted with --delete-orphans.
 *   - skip     → already correct, or has no venueId to resolve.
 *
 * Auth: Application Default Credentials for prod.
 *   gcloud auth application-default login
 * Run with NODE, never bun (gcp-metadata bug — see memory):
 *   Dry run (DEFAULT — writes nothing, just reports):
 *     node scripts/backfill-legacy-location.js
 *   Apply to production (rounds-8d89f):
 *     node scripts/backfill-legacy-location.js --apply
 *   Apply and remove docs whose venue is gone from the seed:
 *     node scripts/backfill-legacy-location.js --apply --delete-orphans
 *   Against the local Firestore emulator (no ADC needed):
 *     FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/backfill-legacy-location.js --apply
 */

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMetroForCity } = require('../lib/constants');
const venueSeed = require('../assets/venues.json');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'rounds-8d89f';
const COLLECTIONS = ['ratings', 'posts'];
const BATCH_LIMIT = 450; // under Firestore's 500-op cap, with headroom.
const SAMPLE_LIMIT = 8;  // how many example rows to print per bucket.

const APPLY = process.argv.includes('--apply');
const DELETE_ORPHANS = process.argv.includes('--delete-orphans');
const USING_EMULATOR = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

// venueId -> real city, from the seed (the authoritative location per ADR 007).
function buildVenueCityIndex(seed) {
  const index = new Map();
  for (const city of Object.values(seed?.cities || {})) {
    for (const venue of city?.venues || []) {
      if (venue?.id && venue?.city) index.set(venue.id, venue.city);
    }
  }
  return index;
}

// What P0 would stamp for this doc today, or a reason it can't be resolved.
function resolveTarget(data, venueCityIndex) {
  if (!data.venueId) return { kind: 'no-venue-id' };
  const city = venueCityIndex.get(data.venueId);
  if (!city) return { kind: 'orphan', venueId: data.venueId };
  const metro = getMetroForCity(city);
  if (!metro) return { kind: 'orphan', venueId: data.venueId, city };
  const alreadyCorrect = data.city === city && data.metro === metro;
  return { kind: alreadyCorrect ? 'already-correct' : 'fix', city, metro };
}

function emptyBucket() {
  return {
    total: 0, alreadyCorrect: 0, fixed: 0, orphans: 0, unresolved: 0,
    fixSamples: [], orphanSamples: [], unresolvedSamples: [],
  };
}

async function backfillCollection(db, name, venueCityIndex) {
  const bucket = emptyBucket();
  const snap = await db.collection(name).get();

  let batch = db.batch();
  let ops = 0;
  const commit = async () => {
    if (ops > 0 && APPLY) await batch.commit();
    batch = db.batch();
    ops = 0;
  };

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const target = resolveTarget(data, venueCityIndex);
    bucket.total += 1;

    if (target.kind === 'already-correct') {
      bucket.alreadyCorrect += 1;
    } else if (target.kind === 'fix') {
      bucket.fixed += 1;
      if (bucket.fixSamples.length < SAMPLE_LIMIT) {
        bucket.fixSamples.push(
          `${docSnap.id}: city ${data.city ?? '∅'} → ${target.city}, metro ${data.metro ?? '∅'} → ${target.metro}`
        );
      }
      batch.update(docSnap.ref, { city: target.city, metro: target.metro });
      ops += 1;
    } else if (target.kind === 'orphan') {
      bucket.orphans += 1;
      if (bucket.orphanSamples.length < SAMPLE_LIMIT) {
        bucket.orphanSamples.push(
          `${docSnap.id}: venueId ${target.venueId} not in seed (stored city ${data.city ?? '∅'})${DELETE_ORPHANS ? ' [delete]' : ''}`
        );
      }
      if (DELETE_ORPHANS) {
        batch.delete(docSnap.ref);
        ops += 1;
      }
    } else {
      bucket.unresolved += 1;
      if (bucket.unresolvedSamples.length < SAMPLE_LIMIT) {
        bucket.unresolvedSamples.push(`${docSnap.id}: no venueId — left untouched`);
      }
    }

    if (ops >= BATCH_LIMIT) await commit();
  }
  await commit();
  return bucket;
}

function printBucket(name, b) {
  console.log(`\n── ${name} ──`);
  console.log(`  scanned:         ${b.total}`);
  console.log(`  already correct: ${b.alreadyCorrect}`);
  console.log(`  ${APPLY ? 'fixed' : 'would fix'}:       ${b.fixed}`);
  console.log(`  orphans:         ${b.orphans}${DELETE_ORPHANS ? (APPLY ? ' (deleted)' : ' (would delete)') : ' (reported only)'}`);
  console.log(`  no venueId:      ${b.unresolved}`);
  if (b.fixSamples.length) console.log('  e.g.\n    ' + b.fixSamples.join('\n    '));
  if (b.orphanSamples.length) console.log('  orphans e.g.\n    ' + b.orphanSamples.join('\n    '));
  if (b.unresolvedSamples.length) console.log('  unresolved e.g.\n    ' + b.unresolvedSamples.join('\n    '));
}

async function main() {
  const venueCityIndex = buildVenueCityIndex(venueSeed);
  if (venueCityIndex.size === 0) throw new Error('Venue seed is empty — refusing to run.');

  initializeApp(
    USING_EMULATOR
      ? { projectId: PROJECT_ID }
      : { projectId: PROJECT_ID, credential: applicationDefault() }
  );
  const db = getFirestore();

  const target = USING_EMULATOR ? `emulator (${process.env.FIRESTORE_EMULATOR_HOST})` : `PRODUCTION (${PROJECT_ID})`;
  console.log(`\nBackfill legacy location (ADR 007)`);
  console.log(`  target:   ${target}`);
  console.log(`  mode:     ${APPLY ? 'APPLY — writes will be committed' : 'DRY RUN — no writes'}`);
  console.log(`  orphans:  ${DELETE_ORPHANS ? 'will be deleted' : 'reported only (pass --delete-orphans to remove)'}`);
  console.log(`  seed:     ${venueCityIndex.size} venues indexed`);
  if (APPLY && !USING_EMULATOR) {
    console.log('\n  ⚠️  Writing to the PRODUCTION project. Ctrl-C now if that is not intended.');
  }

  let grandFix = 0;
  let grandOrphan = 0;
  for (const name of COLLECTIONS) {
    const bucket = await backfillCollection(db, name, venueCityIndex);
    printBucket(name, bucket);
    grandFix += bucket.fixed;
    grandOrphan += bucket.orphans;
  }

  console.log(
    `\n${APPLY ? '✓ Applied' : '○ Dry run'}: ${grandFix} doc(s) ${APPLY ? 'relabeled' : 'to relabel'}, ` +
    `${grandOrphan} orphan(s)${DELETE_ORPHANS && APPLY ? ' deleted' : ''}.`
  );
  if (!APPLY) console.log('  Re-run with --apply to commit these changes.');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('\n✗ backfill-legacy-location failed:', e.message || e);
    if (/credential|ADC|application default|UNAUTHENTICATED|metadata/i.test(String(e))) {
      console.error('  → Auth: run `gcloud auth application-default login` first (prod needs ADC).');
    }
    process.exit(1);
  });
