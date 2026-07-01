/**
 * Seed the Firestore **emulator** with ratings for `test-alice` so the E2E
 * duel-loop flow can reach app/compare.js (ADR 010).
 *
 * Why this exists: friends-seed.js gives alice a profile but NO ratings, so
 * My List's rank area stays locked ("rank unlocks at 5 visits") and Compare
 * can never produce a pair (see .maestro/compare.yaml's DATA REALITY note).
 * This seeds 5 ratings — 3 in `cocktail_bar` (2 loved + 1 fine → an in-band
 * duel pair) plus a pub and a wine bar — which (a) crosses the 5-visit unlock
 * and (b) gives compare.js a cohort with 2+ rated venues to duel.
 *
 * Prerequisites:
 *   firebase emulators:start --only auth,firestore
 * Run (after friends-seed.js):
 *   node scripts/e2e-ratings-seed.js
 *
 * Safety: refuses to run unless the Firestore host is a local emulator.
 */
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'rounds-8d89f';
const FS_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';

// HARD GUARD — never touch a real Firestore.
if (!/^(127\.0\.0\.1|localhost|0\.0\.0\.0):\d+$/.test(FS_HOST)) {
  throw new Error(`Refusing to run: FIRESTORE_EMULATOR_HOST "${FS_HOST}" is not a local emulator.`);
}
process.env.FIRESTORE_EMULATOR_HOST = FS_HOST;

const UID = process.env.E2E_UID || 'test-alice';

// Real Boston venues from assets/venues.json. Three cocktail bars give compare.js
// a cohort with an in-band duel pair (the two 'loved' ones).
const RATINGS = [
  { venueId: 'ovt:bf656e92-1a16-4274-8d76-6ad614ccbdc8', venueName: 'The Last Drop', cohort: 'cocktail_bar', sentiment: 'loved' },
  { venueId: 'ovt:a1f98350-956c-4b31-8524-39172c8649d9', venueName: 'Brighton Bodega', cohort: 'cocktail_bar', sentiment: 'loved' },
  { venueId: 'ovt:bf0fe8aa-07b7-4c07-a954-854f612d3d92', venueName: "Agoro's Pizza Bar and Grill", cohort: 'cocktail_bar', sentiment: 'fine' },
  { venueId: 'ovt:a6d87e3f-cc4f-4fd2-9e44-adb35b7ec34c', venueName: 'Treehouse', cohort: 'pub', sentiment: 'loved' },
  { venueId: 'ovt:3335f6b4-1056-4b33-a2e1-dc5e69ab7d7d', venueName: 'Bag Ladies Tea', cohort: 'wine_bar', sentiment: 'fine' },
];

async function main() {
  initializeApp({ projectId: PROJECT_ID });
  const db = getFirestore();

  // Metro lens so My List / Compare span the Boston catalog (ADR 007).
  await db.collection('users').doc(UID).set({ metro: 'boston' }, { merge: true });

  for (const r of RATINGS) {
    await db.collection('ratings').add({
      userId: UID,
      username: 'alice',
      venueId: r.venueId,
      venueName: r.venueName,
      cohort: r.cohort,
      city: 'boston',
      metro: 'boston',
      sentiment: r.sentiment,
      visibility: 'public',
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  console.log(`✓ Seeded metro + ${RATINGS.length} ratings for ${UID} (3 cocktail_bar → in-band duel pair)`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('✗ e2e-ratings-seed failed:', e);
    process.exit(1);
  });
