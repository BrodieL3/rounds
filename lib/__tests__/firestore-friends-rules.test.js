const fs = require('fs');
const path = require('path');
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require('@firebase/rules-unit-testing');
const {
  arrayUnion,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
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

async function seed(pathSegments, data) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), ...pathSegments), data);
  });
}

beforeAll(async () => {
  if (!rulesEmulatorAvailable) return;

  testEnv = await initializeTestEnvironment({
    projectId: `rounds-friends-rules-${Date.now()}`,
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

describeRules('Friends Firestore rules', () => {
  test('requester can create a pending Friend Request but cannot forge or request self', async () => {
    const aliceDb = dbFor('alice');

    await assertSucceeds(setDoc(doc(aliceDb, 'friendRequests', 'alice_bob'), {
      fromUid: 'alice',
      toUid: 'bob',
      status: 'pending',
      createdAt: 1,
    }));

    await assertFails(setDoc(doc(aliceDb, 'friendRequests', 'bob_alice'), {
      fromUid: 'bob',
      toUid: 'alice',
      status: 'pending',
      createdAt: 1,
    }));

    await assertFails(setDoc(doc(aliceDb, 'friendRequests', 'alice_alice'), {
      fromUid: 'alice',
      toUid: 'alice',
      status: 'pending',
      createdAt: 1,
    }));
  });

  test('only request participants can read a Friend Request', async () => {
    await seed(['friendRequests', 'alice_bob'], {
      fromUid: 'alice',
      toUid: 'bob',
      status: 'pending',
      createdAt: 1,
    });

    await assertSucceeds(getDoc(doc(dbFor('alice'), 'friendRequests', 'alice_bob')));
    await assertSucceeds(getDoc(doc(dbFor('bob'), 'friendRequests', 'alice_bob')));
    await assertFails(getDoc(doc(dbFor('cara'), 'friendRequests', 'alice_bob')));
  });

  test('requester cancels outgoing request and recipient declines incoming request', async () => {
    await seed(['friendRequests', 'alice_bob'], {
      fromUid: 'alice',
      toUid: 'bob',
      status: 'pending',
      createdAt: 1,
    });

    await assertSucceeds(updateDoc(doc(dbFor('alice'), 'friendRequests', 'alice_bob'), {
      status: 'canceled',
      respondedAt: 2,
    }));

    await seed(['friendRequests', 'cara_bob'], {
      fromUid: 'cara',
      toUid: 'bob',
      status: 'pending',
      createdAt: 1,
    });

    await assertSucceeds(updateDoc(doc(dbFor('bob'), 'friendRequests', 'cara_bob'), {
      status: 'declined',
      respondedAt: 2,
    }));

    await assertFails(updateDoc(doc(dbFor('cara'), 'friendRequests', 'cara_bob'), {
      status: 'accepted',
      respondedAt: 2,
    }));
  });

  test('recipient can accept request in a batch that creates Friendship, mutual follows, and notification', async () => {
    await seed(['users', 'alice'], { uid: 'alice', followers: [], following: [] });
    await seed(['users', 'bob'], { uid: 'bob', followers: [], following: [] });
    await seed(['friendRequests', 'alice_bob'], {
      fromUid: 'alice',
      toUid: 'bob',
      status: 'pending',
      createdAt: 1,
    });

    const bobDb = dbFor('bob');
    const batch = writeBatch(bobDb);
    batch.update(doc(bobDb, 'friendRequests', 'alice_bob'), {
      status: 'accepted',
      respondedAt: 2,
    });
    batch.set(doc(bobDb, 'friendships', 'alice_bob'), {
      memberUids: ['alice', 'bob'],
      createdAt: 2,
      createdFromRequestId: 'alice_bob',
    });
    batch.update(doc(bobDb, 'users', 'alice'), {
      following: arrayUnion('bob'),
      followers: arrayUnion('bob'),
    });
    batch.update(doc(bobDb, 'users', 'bob'), {
      following: arrayUnion('alice'),
      followers: arrayUnion('alice'),
    });
    batch.set(doc(bobDb, 'users', 'alice', 'notifications', 'friend_request_accepted_bob'), {
      type: 'friend_request_accepted',
      actorUid: 'bob',
      createdAt: 2,
    });

    await assertSucceeds(batch.commit());
  });

  test('only Friendship members can read Friendship docs', async () => {
    await seed(['friendships', 'alice_bob'], {
      memberUids: ['alice', 'bob'],
      createdAt: 2,
      createdFromRequestId: 'alice_bob',
    });

    await assertSucceeds(getDoc(doc(dbFor('alice'), 'friendships', 'alice_bob')));
    await assertSucceeds(getDoc(doc(dbFor('bob'), 'friendships', 'alice_bob')));
    await assertFails(getDoc(doc(dbFor('cara'), 'friendships', 'alice_bob')));
  });
});
