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

  test('Friend can create canonical DM conversation with first text message batch', async () => {
    await seed(['users', 'alice'], { uid: 'alice', followers: ['bob'], following: ['bob'] });
    await seed(['users', 'bob'], { uid: 'bob', followers: ['alice'], following: ['alice'] });
    await seed(['friendships', 'alice_bob'], {
      memberUids: ['alice', 'bob'],
      createdAt: 2,
      createdFromRequestId: 'alice_bob',
    });

    const aliceDb = dbFor('alice');
    const batch = writeBatch(aliceDb);
    batch.set(doc(aliceDb, 'conversations', 'dm_alice_bob'), {
      type: 'dm',
      memberUids: ['alice', 'bob'],
      createdAt: 3,
      createdByUid: 'alice',
      lastMessageAt: 3,
      lastMessage: { id: 'm1', senderUid: 'alice', type: 'text', text: 'meet at 9?', createdAt: 3 },
    });
    batch.set(doc(aliceDb, 'conversations', 'dm_alice_bob', 'members', 'alice'), {
      uid: 'alice',
      role: 'member',
      joinedAt: 3,
      leftAt: null,
    });
    batch.set(doc(aliceDb, 'conversations', 'dm_alice_bob', 'members', 'bob'), {
      uid: 'bob',
      role: 'member',
      joinedAt: 3,
      leftAt: null,
    });
    batch.set(doc(aliceDb, 'conversations', 'dm_alice_bob', 'messages', 'm1'), {
      senderUid: 'alice',
      type: 'text',
      text: 'meet at 9?',
      createdAt: 3,
      deletedForEveryoneAt: null,
    });
    batch.set(doc(aliceDb, 'users', 'alice', 'conversationStates', 'dm_alice_bob'), {
      hiddenAt: null,
      lastSeenAt: 3,
    });
    batch.set(doc(aliceDb, 'users', 'bob', 'conversationStates', 'dm_alice_bob'), {
      hiddenAt: null,
    });
    batch.set(doc(aliceDb, 'users', 'bob', 'notifications', 'm1'), {
      type: 'new_direct_message',
      actorUid: 'alice',
      conversationId: 'dm_alice_bob',
      createdAt: 3,
    });

    await assertSucceeds(batch.commit());
  });

  test('non-friend cannot create direct message conversation', async () => {
    const aliceDb = dbFor('alice');

    await assertFails(setDoc(doc(aliceDb, 'conversations', 'dm_alice_cara'), {
      type: 'dm',
      memberUids: ['alice', 'cara'],
      createdAt: 3,
      createdByUid: 'alice',
      lastMessageAt: 3,
      lastMessage: { id: 'm1', senderUid: 'alice', type: 'text', text: 'hey', createdAt: 3 },
    }));
  });

  test('non-member cannot read conversations or messages', async () => {
    await seed(['conversations', 'dm_alice_bob'], {
      type: 'dm',
      memberUids: ['alice', 'bob'],
      createdAt: 3,
      createdByUid: 'alice',
      lastMessageAt: 3,
      lastMessage: { id: 'm1', senderUid: 'alice', type: 'text', text: 'meet at 9?', createdAt: 3 },
    });
    await seed(['conversations', 'dm_alice_bob', 'messages', 'm1'], {
      senderUid: 'alice',
      type: 'text',
      text: 'meet at 9?',
      createdAt: 3,
      deletedForEveryoneAt: null,
    });

    await assertSucceeds(getDoc(doc(dbFor('alice'), 'conversations', 'dm_alice_bob')));
    await assertSucceeds(getDoc(doc(dbFor('bob'), 'conversations', 'dm_alice_bob', 'messages', 'm1')));
    await assertFails(getDoc(doc(dbFor('cara'), 'conversations', 'dm_alice_bob')));
    await assertFails(getDoc(doc(dbFor('cara'), 'conversations', 'dm_alice_bob', 'messages', 'm1')));
  });

  test('member can send subsequent text message and update own conversation state', async () => {
    await seed(['users', 'alice'], { uid: 'alice', followers: ['bob'], following: ['bob'] });
    await seed(['users', 'bob'], { uid: 'bob', followers: ['alice'], following: ['alice'] });
    await seed(['conversations', 'dm_alice_bob'], {
      type: 'dm',
      memberUids: ['alice', 'bob'],
      createdAt: 3,
      createdByUid: 'alice',
      lastMessageAt: 3,
      lastMessage: { id: 'm1', senderUid: 'alice', type: 'text', text: 'meet at 9?', createdAt: 3 },
    });

    const bobDb = dbFor('bob');
    const batch = writeBatch(bobDb);
    batch.update(doc(bobDb, 'conversations', 'dm_alice_bob'), {
      lastMessageAt: 4,
      lastMessage: { id: 'm2', senderUid: 'bob', type: 'text', text: 'omw', createdAt: 4 },
    });
    batch.set(doc(bobDb, 'conversations', 'dm_alice_bob', 'messages', 'm2'), {
      senderUid: 'bob',
      type: 'text',
      text: 'omw',
      createdAt: 4,
      deletedForEveryoneAt: null,
    });
    batch.set(doc(bobDb, 'users', 'bob', 'conversationStates', 'dm_alice_bob'), {
      hiddenAt: null,
      lastSeenAt: 4,
    });
    batch.set(doc(bobDb, 'users', 'alice', 'notifications', 'm2'), {
      type: 'new_direct_message',
      actorUid: 'bob',
      conversationId: 'dm_alice_bob',
      createdAt: 4,
    });

    await assertSucceeds(batch.commit());
  });

  test('user can hide and mark own conversation seen but cannot update another user state', async () => {
    await seed(['conversations', 'dm_alice_bob'], {
      type: 'dm',
      memberUids: ['alice', 'bob'],
      createdAt: 3,
      createdByUid: 'alice',
      lastMessageAt: 3,
      lastMessage: { id: 'm1', senderUid: 'alice', type: 'text', text: 'meet at 9?', createdAt: 3 },
    });

    await assertSucceeds(setDoc(doc(dbFor('alice'), 'users', 'alice', 'conversationStates', 'dm_alice_bob'), {
      hiddenAt: 5,
      lastSeenAt: 5,
    }));
    await assertFails(setDoc(doc(dbFor('alice'), 'users', 'bob', 'conversationStates', 'dm_alice_bob'), {
      hiddenAt: 5,
    }));
  });

  test('client cannot create group conversation directly', async () => {
    await assertFails(setDoc(doc(dbFor('alice'), 'conversations', 'group1'), {
      type: 'group',
      memberUids: ['alice', 'bob', 'cara'],
      adminUid: 'alice',
      name: 'Birthday',
      photoUrl: null,
      createdAt: 10,
      createdByUid: 'alice',
      lastMessageAt: null,
      lastMessage: null,
      archivedAt: null,
    }));
  });

  test('active group member can read and send group text but non-member cannot', async () => {
    await seed(['conversations', 'group1'], {
      type: 'group',
      memberUids: ['alice', 'bob', 'cara'],
      adminUid: 'alice',
      name: 'Birthday',
      photoUrl: null,
      createdAt: 10,
      createdByUid: 'alice',
      lastMessageAt: null,
      lastMessage: null,
      archivedAt: null,
    });
    await seed(['conversations', 'group1', 'members', 'bob'], {
      uid: 'bob', role: 'member', joinedAt: 10, leftAt: null, invitedByUid: 'alice',
    });

    await assertSucceeds(getDoc(doc(dbFor('bob'), 'conversations', 'group1')));
    await assertFails(getDoc(doc(dbFor('dana'), 'conversations', 'group1')));

    const bobDb = dbFor('bob');
    const batch = writeBatch(bobDb);
    batch.update(doc(bobDb, 'conversations', 'group1'), {
      lastMessageAt: 11,
      lastMessage: { id: 'm1', senderUid: 'bob', type: 'text', text: 'where first?', createdAt: 11 },
    });
    batch.set(doc(bobDb, 'conversations', 'group1', 'messages', 'm1'), {
      senderUid: 'bob', type: 'text', text: 'where first?', createdAt: 11, deletedForEveryoneAt: null,
    });
    batch.set(doc(bobDb, 'users', 'bob', 'conversationStates', 'group1'), {
      hiddenAt: null, lastSeenAt: 11,
    });
    batch.set(doc(bobDb, 'users', 'alice', 'notifications', 'm1'), {
      type: 'new_group_message', actorUid: 'bob', conversationId: 'group1', createdAt: 11,
    });

    await assertSucceeds(batch.commit());

    await assertFails(setDoc(doc(dbFor('dana'), 'conversations', 'group1', 'messages', 'x'), {
      senderUid: 'dana', type: 'text', text: 'hi', createdAt: 12, deletedForEveryoneAt: null,
    }));
  });

  test('left group member cannot read or send group messages', async () => {
    await seed(['conversations', 'group1'], {
      type: 'group',
      memberUids: ['alice', 'cara'],
      adminUid: 'alice',
      name: 'Birthday',
      photoUrl: null,
      createdAt: 10,
      createdByUid: 'alice',
      lastMessageAt: 11,
      lastMessage: { id: 'm1', senderUid: 'alice', type: 'text', text: 'hi', createdAt: 11 },
      archivedAt: null,
    });
    await seed(['conversations', 'group1', 'members', 'bob'], {
      uid: 'bob', role: 'member', joinedAt: 10, leftAt: 12, invitedByUid: 'alice',
    });
    await seed(['conversations', 'group1', 'messages', 'm1'], {
      senderUid: 'alice', type: 'text', text: 'hi', createdAt: 11, deletedForEveryoneAt: null,
    });

    await assertFails(getDoc(doc(dbFor('bob'), 'conversations', 'group1')));
    await assertFails(getDoc(doc(dbFor('bob'), 'conversations', 'group1', 'messages', 'm1')));
    await assertFails(setDoc(doc(dbFor('bob'), 'conversations', 'group1', 'messages', 'm2'), {
      senderUid: 'bob', type: 'text', text: 'am I still here?', createdAt: 13, deletedForEveryoneAt: null,
    }));
  });
});
