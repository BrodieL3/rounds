const fs = require('fs');
const path = require('path');
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require('@firebase/rules-unit-testing');
const {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
} = require('firebase/firestore');

let testEnv;
const rulesEmulatorAvailable = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const describeRules = rulesEmulatorAvailable ? describe : describe.skip;

function rulesPath() {
  return path.join(__dirname, '..', '..', 'firestore.rules');
}

function dbFor(uid) {
  return testEnv.authenticatedContext(uid).firestore();
}

beforeAll(async () => {
  if (!rulesEmulatorAvailable) return;

  testEnv = await initializeTestEnvironment({
    projectId: `rounds-venue-rules-${Date.now()}`,
    firestore: {
      rules: fs.readFileSync(rulesPath(), 'utf8'),
    },
  });
});

beforeEach(async () => {
  if (testEnv) await testEnv.clearFirestore();
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

describeRules('Venue bookmark rules', () => {
  test('owner can read their own bookmark', async () => {
    const aliceDb = dbFor('alice');
    await assertSucceeds(setDoc(doc(aliceDb, 'users/alice/venueBookmarks/v1'), {
      venueId: 'v1', venueName: 'Bar', city: 'nyc', cohort: 'cocktail_bar', createdAt: 1,
    }));
    await assertSucceeds(getDoc(doc(aliceDb, 'users/alice/venueBookmarks/v1')));
  });

  test('owner can write their own bookmark', async () => {
    const aliceDb = dbFor('alice');
    await assertSucceeds(setDoc(doc(aliceDb, 'users/alice/venueBookmarks/v1'), {
      venueId: 'v1', venueName: 'Bar', city: 'nyc', cohort: 'cocktail_bar', createdAt: 1,
    }));
  });

  test('owner can delete their own bookmark', async () => {
    const aliceDb = dbFor('alice');
    await setDoc(doc(aliceDb, 'users/alice/venueBookmarks/v1'), {
      venueId: 'v1', venueName: 'Bar', city: 'nyc', cohort: 'cocktail_bar', createdAt: 1,
    });
    await assertSucceeds(deleteDoc(doc(aliceDb, 'users/alice/venueBookmarks/v1')));
  });

  test('non-owner cannot read another user bookmark', async () => {
    const aliceDb = dbFor('alice');
    const bobDb = dbFor('bob');
    await setDoc(doc(aliceDb, 'users/alice/venueBookmarks/v1'), {
      venueId: 'v1', venueName: 'Bar', city: 'nyc', cohort: 'cocktail_bar', createdAt: 1,
    });
    await assertFails(getDoc(doc(bobDb, 'users/alice/venueBookmarks/v1')));
  });

  test('non-owner cannot write another user bookmark', async () => {
    const bobDb = dbFor('bob');
    await assertFails(setDoc(doc(bobDb, 'users/alice/venueBookmarks/v1'), {
      venueId: 'v1', venueName: 'Bar', city: 'nyc', cohort: 'cocktail_bar', createdAt: 1,
    }));
  });

  test('non-owner cannot delete another user bookmark', async () => {
    const aliceDb = dbFor('alice');
    const bobDb = dbFor('bob');
    await setDoc(doc(aliceDb, 'users/alice/venueBookmarks/v1'), {
      venueId: 'v1', venueName: 'Bar', city: 'nyc', cohort: 'cocktail_bar', createdAt: 1,
    });
    await assertFails(deleteDoc(doc(bobDb, 'users/alice/venueBookmarks/v1')));
  });

  test('unauthenticated cannot read bookmark', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(unauthDb, 'users/alice/venueBookmarks/v1')));
  });
});
