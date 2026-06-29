const fs = require('fs');
const path = require('path');
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require('@firebase/rules-unit-testing');
const { doc, setDoc, Timestamp } = require('firebase/firestore');

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
    projectId: `rounds-venue-forum-rules-${Date.now()}`,
    firestore: { rules: fs.readFileSync(rulesPath(), 'utf8') },
  });
});

beforeEach(async () => {
  if (testEnv) await testEnv.clearFirestore();
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

const VENUE = 'ovt:abc';
const future = () => Timestamp.fromDate(new Date(Date.now() + 3600 * 1000));
const past = () => Timestamp.fromDate(new Date(Date.now() - 3600 * 1000));

describeRules('Venue presence + forum rules', () => {
  test("a user can create their own presence but not another user's", async () => {
    const alice = dbFor('alice');
    await assertSucceeds(setDoc(doc(alice, 'venuePresence', VENUE, 'present', 'alice'), { uid: 'alice', expiresAt: future() }));
    await assertFails(setDoc(doc(alice, 'venuePresence', VENUE, 'present', 'bob'), { uid: 'bob', expiresAt: future() }));
  });

  test('a checked-in user can post to the venue forum', async () => {
    await seed(['venuePresence', VENUE, 'present', 'alice'], { uid: 'alice', expiresAt: future() });
    await assertSucceeds(setDoc(doc(dbFor('alice'), 'venueForums', VENUE, 'messages', 'm1'), { uid: 'alice', text: 'short line tonight' }));
  });

  test('a user who is NOT checked in cannot post', async () => {
    await assertFails(setDoc(doc(dbFor('bob'), 'venueForums', VENUE, 'messages', 'm2'), { uid: 'bob', text: 'hi' }));
  });

  test('a user with EXPIRED presence cannot post', async () => {
    await seed(['venuePresence', VENUE, 'present', 'carol'], { uid: 'carol', expiresAt: past() });
    await assertFails(setDoc(doc(dbFor('carol'), 'venueForums', VENUE, 'messages', 'm3'), { uid: 'carol', text: 'too late' }));
  });

  test('a forum message cannot be forged under another uid', async () => {
    await seed(['venuePresence', VENUE, 'present', 'alice'], { uid: 'alice', expiresAt: future() });
    await assertFails(setDoc(doc(dbFor('alice'), 'venueForums', VENUE, 'messages', 'm4'), { uid: 'bob', text: 'spoof' }));
  });
});
