const fs = require('fs');
const path = require('path');
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc } = require('firebase/firestore');

let testEnv;
const rulesEmulatorAvailable = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const describeRules = rulesEmulatorAvailable ? describe : describe.skip;

function rulesPath() {
  return path.join(__dirname, '..', '..', 'firestore.rules');
}

function dbFor(uid) {
  return testEnv.authenticatedContext(uid).firestore();
}

async function seed(pathSegments, data) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), ...pathSegments), data);
  });
}

beforeAll(async () => {
  if (!rulesEmulatorAvailable) return;
  testEnv = await initializeTestEnvironment({
    projectId: `rounds-connection-token-rules-${Date.now()}`,
    firestore: { rules: fs.readFileSync(rulesPath(), 'utf8') },
  });
});

beforeEach(async () => {
  if (testEnv) await testEnv.clearFirestore();
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

describeRules('connectionTokens rules', () => {
  test('a user can mint a token for themselves', async () => {
    await assertSucceeds(setDoc(doc(dbFor('alice'), 'connectionTokens', 'tok1'), { uid: 'alice', consumed: false }));
  });

  test('a user cannot mint a token impersonating someone else', async () => {
    await assertFails(setDoc(doc(dbFor('alice'), 'connectionTokens', 'tok2'), { uid: 'bob', consumed: false }));
  });

  test('tokens are never client-readable (resolution is server-only)', async () => {
    await seed(['connectionTokens', 'tok3'], { uid: 'alice', consumed: false });
    await assertFails(getDoc(doc(dbFor('bob'), 'connectionTokens', 'tok3')));
    await assertFails(getDoc(doc(dbFor('alice'), 'connectionTokens', 'tok3')));
  });

  test('clients cannot mark a token consumed (server-only)', async () => {
    await seed(['connectionTokens', 'tok4'], { uid: 'alice', consumed: false });
    await assertFails(setDoc(doc(dbFor('alice'), 'connectionTokens', 'tok4'), { uid: 'alice', consumed: true }));
  });
});
