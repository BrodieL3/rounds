const fs = require('fs');
const path = require('path');
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require('@firebase/rules-unit-testing');
const { collection, doc, getDocs, query, setDoc, where } = require('firebase/firestore');

let testEnv;
const rulesEmulatorAvailable = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const describeRules = rulesEmulatorAvailable ? describe : describe.skip;

function rulesPath() {
  return path.join(__dirname, '..', '..', 'firestore.rules');
}

function dbFor(uid) {
  return testEnv.authenticatedContext(uid).firestore();
}

function anonDb() {
  return testEnv.unauthenticatedContext().firestore();
}

async function seed(pathSegments, data) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), ...pathSegments), data);
  });
}

beforeAll(async () => {
  if (!rulesEmulatorAvailable) return;
  testEnv = await initializeTestEnvironment({
    projectId: `rounds-events-rules-${Date.now()}`,
    firestore: { rules: fs.readFileSync(rulesPath(), 'utf8') },
  });
});

beforeEach(async () => {
  if (testEnv) await testEnv.clearFirestore();
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

describeRules('Events + happyHours Firestore rules', () => {
  test('anyone (anon or signed-in) can read events and happy hours', async () => {
    await seed(['events', 'e1'], { venueId: 'ovt:abc', title: 'Trivia Night', metro: 'boston' });
    await seed(['happyHours', 'h1'], { venueId: 'ovt:abc', dayOfWeek: 3 });

    await assertSucceeds(
      getDocs(query(collection(anonDb(), 'events'), where('metro', '==', 'boston'))),
    );
    await assertSucceeds(getDocs(collection(dbFor('alice'), 'happyHours')));
  });

  test('no client may write events or happy hours (server-only)', async () => {
    const aliceDb = dbFor('alice');
    await assertFails(setDoc(doc(aliceDb, 'events', 'e2'), { venueId: 'ovt:abc', title: 'Fake' }));
    await assertFails(setDoc(doc(aliceDb, 'happyHours', 'h2'), { venueId: 'ovt:abc', dayOfWeek: 1 }));
  });
});
