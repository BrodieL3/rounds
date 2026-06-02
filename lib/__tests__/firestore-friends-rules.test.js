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

  test('Friend can create canonical DM conversation with first venue link message batch', async () => {
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
      lastMessage: {
        id: 'm1', senderUid: 'alice', type: 'venue_link', venueId: 'venue1', venueName: 'Good Bar',
        venueCohort: 'cocktail_bar', venueCity: 'nyc', venueAddress: '123 Night St', createdAt: 3,
      },
    });
    batch.set(doc(aliceDb, 'conversations', 'dm_alice_bob', 'members', 'alice'), {
      uid: 'alice', role: 'member', joinedAt: 3, leftAt: null,
    });
    batch.set(doc(aliceDb, 'conversations', 'dm_alice_bob', 'members', 'bob'), {
      uid: 'bob', role: 'member', joinedAt: 3, leftAt: null,
    });
    batch.set(doc(aliceDb, 'conversations', 'dm_alice_bob', 'messages', 'm1'), {
      senderUid: 'alice', type: 'venue_link', venueId: 'venue1', venueName: 'Good Bar',
      venueCohort: 'cocktail_bar', venueCity: 'nyc', venueAddress: '123 Night St', createdAt: 3, deletedForEveryoneAt: null,
    });
    batch.set(doc(aliceDb, 'users', 'alice', 'conversationStates', 'dm_alice_bob'), {
      hiddenAt: null, lastSeenAt: 3,
    });
    batch.set(doc(aliceDb, 'users', 'bob', 'conversationStates', 'dm_alice_bob'), {
      hiddenAt: null,
    });
    batch.set(doc(aliceDb, 'users', 'bob', 'notifications', 'm1'), {
      type: 'new_direct_message', actorUid: 'alice', conversationId: 'dm_alice_bob', createdAt: 3,
    });

    await assertSucceeds(batch.commit());
  });

  test('venue link message shape is required and non-friends cannot first-send venue links', async () => {
    await seed(['conversations', 'dm_alice_bob'], {
      type: 'dm',
      memberUids: ['alice', 'bob'],
      createdAt: 3,
      createdByUid: 'alice',
      lastMessageAt: 3,
      lastMessage: { id: 'm1', senderUid: 'alice', type: 'text', text: 'meet at 9?', createdAt: 3 },
    });

    await assertFails(setDoc(doc(dbFor('alice'), 'conversations', 'dm_alice_bob', 'messages', 'badVenue'), {
      senderUid: 'alice', type: 'venue_link', venueId: 'venue1', createdAt: 4, deletedForEveryoneAt: null,
    }));

    await assertFails(setDoc(doc(dbFor('alice'), 'conversations', 'dm_alice_cara'), {
      type: 'dm',
      memberUids: ['alice', 'cara'],
      createdAt: 3,
      createdByUid: 'alice',
      lastMessageAt: 3,
      lastMessage: {
        id: 'm1', senderUid: 'alice', type: 'venue_link', venueId: 'venue1', venueName: 'Good Bar',
        venueCohort: 'cocktail_bar', venueCity: 'nyc', venueAddress: '123 Night St', createdAt: 3,
      },
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

  test('user can hide, hide messages, and mark own conversation seen but cannot update another user state', async () => {
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
      hiddenMessageIds: ['m1'],
    }));
    await assertFails(setDoc(doc(dbFor('alice'), 'users', 'bob', 'conversationStates', 'dm_alice_bob'), {
      hiddenAt: 5,
    }));
  });

  test('notification docs omit private message body fields', async () => {
    await assertSucceeds(setDoc(doc(dbFor('alice'), 'users', 'bob', 'notifications', 'n1'), {
      type: 'new_direct_message', actorUid: 'alice', conversationId: 'dm_alice_bob', createdAt: 1,
    }));

    await assertFails(setDoc(doc(dbFor('alice'), 'users', 'bob', 'notifications', 'n2'), {
      type: 'new_direct_message', actorUid: 'alice', conversationId: 'dm_alice_bob', body: 'meet at 9?', createdAt: 1,
    }));
  });

  test('safety reports require reporter-owned safe shape while legacy venue reports still work', async () => {
    await assertSucceeds(setDoc(doc(dbFor('alice'), 'reports', 'safety1'), {
      reporterUid: 'alice', targetType: 'message', targetId: 'm1', conversationId: 'dm_alice_bob', reason: 'harassment', status: 'open', createdAt: 1,
    }));

    await assertFails(setDoc(doc(dbFor('alice'), 'reports', 'badSafety'), {
      reporterUid: 'bob', targetType: 'message', targetId: 'm1', reason: 'harassment', status: 'open', createdAt: 1,
    }));

    await assertFails(setDoc(doc(dbFor('alice'), 'reports', 'leakySafety'), {
      reporterUid: 'alice', targetType: 'message', targetId: 'm1', reason: 'harassment', messageText: 'private text', status: 'open', createdAt: 1,
    }));

    await assertSucceeds(setDoc(doc(dbFor('alice'), 'reports', 'venue1'), {
      userId: 'alice', venueId: 'venue1', venueName: 'Good Bar', suggestedCohort: 'wine bar', createdAt: 1,
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

  test('active group member can send a venue link but non-member cannot', async () => {
    await seed(['conversations', 'group1'], {
      type: 'group',
      memberUids: ['alice', 'bob'],
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

    const bobDb = dbFor('bob');
    const batch = writeBatch(bobDb);
    batch.update(doc(bobDb, 'conversations', 'group1'), {
      lastMessageAt: 11,
      lastMessage: {
        id: 'm1', senderUid: 'bob', type: 'venue_link', venueId: 'venue1', venueName: 'Good Bar',
        venueCohort: 'cocktail_bar', venueCity: 'nyc', venueAddress: '123 Night St', createdAt: 11,
      },
    });
    batch.set(doc(bobDb, 'conversations', 'group1', 'messages', 'm1'), {
      senderUid: 'bob', type: 'venue_link', venueId: 'venue1', venueName: 'Good Bar',
      venueCohort: 'cocktail_bar', venueCity: 'nyc', venueAddress: '123 Night St', createdAt: 11, deletedForEveryoneAt: null,
    });
    batch.set(doc(bobDb, 'users', 'bob', 'conversationStates', 'group1'), {
      hiddenAt: null, lastSeenAt: 11,
    });
    batch.set(doc(bobDb, 'users', 'alice', 'notifications', 'm1'), {
      type: 'new_group_message', actorUid: 'bob', conversationId: 'group1', createdAt: 11,
    });

    await assertSucceeds(batch.commit());

    await assertFails(setDoc(doc(dbFor('dana'), 'conversations', 'group1', 'messages', 'x'), {
      senderUid: 'dana', type: 'venue_link', venueId: 'venue1', venueName: 'Good Bar',
      venueCohort: 'cocktail_bar', venueCity: 'nyc', venueAddress: '123 Night St', createdAt: 12, deletedForEveryoneAt: null,
    }));
  });

  test('active group member can send a photo message but non-member cannot', async () => {
    await seed(['conversations', 'group1'], {
      type: 'group',
      memberUids: ['alice', 'bob'],
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

    const bobDb = dbFor('bob');
    const batch = writeBatch(bobDb);
    batch.update(doc(bobDb, 'conversations', 'group1'), {
      lastMessageAt: 11,
      lastMessage: {
        id: 'm1', senderUid: 'bob', type: 'photo', photoCount: 2, createdAt: 11,
      },
    });
    batch.set(doc(bobDb, 'conversations', 'group1', 'messages', 'm1'), {
      senderUid: 'bob', type: 'photo', mediaPaths: ['conversations/group1/photos/photo_1_0.jpg', 'conversations/group1/photos/photo_1_1.jpg'], aspectRatios: [1.5, 0.75], createdAt: 11, deletedForEveryoneAt: null,
    });
    batch.set(doc(bobDb, 'users', 'bob', 'conversationStates', 'group1'), {
      hiddenAt: null, lastSeenAt: 11,
    });
    batch.set(doc(bobDb, 'users', 'alice', 'notifications', 'm1'), {
      type: 'new_group_message', actorUid: 'bob', conversationId: 'group1', createdAt: 11,
    });

    await assertSucceeds(batch.commit());

    await assertFails(setDoc(doc(dbFor('dana'), 'conversations', 'group1', 'messages', 'x'), {
      senderUid: 'dana', type: 'photo', mediaPaths: ['p.jpg'], aspectRatios: [1.0], createdAt: 12, deletedForEveryoneAt: null,
    }));
  });

  test('DM member can send a photo message and invalid photo shapes are denied', async () => {
    await seed(['users', 'alice'], { uid: 'alice', followers: ['bob'], following: ['bob'] });
    await seed(['users', 'bob'], { uid: 'bob', followers: ['alice'], following: ['alice'] });
    await seed(['friendships', 'alice_bob'], { memberUids: ['alice', 'bob'], createdAt: 1 });
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
      lastMessage: { id: 'm2', senderUid: 'bob', type: 'photo', photoCount: 1, createdAt: 4 },
    });
    batch.set(doc(bobDb, 'conversations', 'dm_alice_bob', 'messages', 'm2'), {
      senderUid: 'bob', type: 'photo', mediaPaths: ['conversations/dm_alice_bob/photos/photo_1_0.jpg'], aspectRatios: [1.0], createdAt: 4, deletedForEveryoneAt: null,
    });
    batch.set(doc(bobDb, 'users', 'bob', 'conversationStates', 'dm_alice_bob'), { hiddenAt: null, lastSeenAt: 4 });
    batch.set(doc(bobDb, 'users', 'alice', 'notifications', 'm2'), {
      type: 'new_direct_message', actorUid: 'bob', conversationId: 'dm_alice_bob', createdAt: 4,
    });
    await assertSucceeds(batch.commit());

    // Wrong senderUid
    await assertFails(setDoc(doc(dbFor('bob'), 'conversations', 'dm_alice_bob', 'messages', 'bad'), {
      senderUid: 'alice', type: 'photo', mediaPaths: ['p.jpg'], aspectRatios: [1.0], createdAt: 5, deletedForEveryoneAt: null,
    }));
    // Too many photos
    await assertFails(setDoc(doc(dbFor('bob'), 'conversations', 'dm_alice_bob', 'messages', 'bad'), {
      senderUid: 'bob', type: 'photo', mediaPaths: Array.from({ length: 11 }, (_, i) => `p${i}.jpg`), aspectRatios: Array.from({ length: 11 }, () => 1.0), createdAt: 5, deletedForEveryoneAt: null,
    }));
    // Mismatched aspectRatios length
    await assertFails(setDoc(doc(dbFor('bob'), 'conversations', 'dm_alice_bob', 'messages', 'bad'), {
      senderUid: 'bob', type: 'photo', mediaPaths: ['a.jpg', 'b.jpg'], aspectRatios: [1.0], createdAt: 5, deletedForEveryoneAt: null,
    }));
    // Invalid lastMessage photoCount
    const badBatch = writeBatch(bobDb);
    badBatch.update(doc(bobDb, 'conversations', 'dm_alice_bob'), {
      lastMessageAt: 5,
      lastMessage: { id: 'm3', senderUid: 'bob', type: 'photo', photoCount: 11, createdAt: 5 },
    });
    badBatch.set(doc(bobDb, 'conversations', 'dm_alice_bob', 'messages', 'm3'), {
      senderUid: 'bob', type: 'photo', mediaPaths: ['p.jpg'], aspectRatios: [1.0], createdAt: 5, deletedForEveryoneAt: null,
    });
    await assertFails(badBatch.commit());
  });

  test('poll message shape is validated as part of validMessageShape', async () => {
    await seed(['users', 'alice'], { uid: 'alice', followers: ['bob'], following: ['bob'] });
    await seed(['users', 'bob'], { uid: 'bob', followers: ['alice'], following: ['alice'] });
    await seed(['friendships', 'alice_bob'], { memberUids: ['alice', 'bob'], createdAt: 1 });
    await seed(['conversations', 'dm_alice_bob'], {
      type: 'dm',
      memberUids: ['alice', 'bob'],
      createdAt: 3,
      createdByUid: 'alice',
      lastMessageAt: 3,
      lastMessage: { id: 'm1', senderUid: 'alice', type: 'text', text: 'meet at 9?', createdAt: 3 },
    });

    // Valid poll message
    await assertSucceeds(setDoc(doc(dbFor('bob'), 'conversations', 'dm_alice_bob', 'messages', 'poll1'), {
      senderUid: 'bob', type: 'poll', question: 'Where?',
      options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }],
      allowMultiple: false, allowMemberOptions: false,
      closesAt: null, closedAt: null, createdAt: 4, deletedForEveryoneAt: null,
    }));

    // Too few options
    await assertFails(setDoc(doc(dbFor('bob'), 'conversations', 'dm_alice_bob', 'messages', 'bad'), {
      senderUid: 'bob', type: 'poll', question: 'Where?',
      options: [{ id: 'a', text: 'A' }],
      allowMultiple: false, allowMemberOptions: false,
      closesAt: null, closedAt: null, createdAt: 5, deletedForEveryoneAt: null,
    }));

    // Missing question
    await assertFails(setDoc(doc(dbFor('bob'), 'conversations', 'dm_alice_bob', 'messages', 'bad'), {
      senderUid: 'bob', type: 'poll', question: '',
      options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }],
      allowMultiple: false, allowMemberOptions: false,
      closesAt: null, closedAt: null, createdAt: 5, deletedForEveryoneAt: null,
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

  test('Block docs are participant-readable and block direct social interactions', async () => {
    await seed(['users', 'alice'], { uid: 'alice', followers: ['bob'], following: ['bob'] });
    await seed(['users', 'bob'], { uid: 'bob', followers: ['alice'], following: ['alice'] });
    await seed(['blocks', 'bob_alice'], { blockerUid: 'bob', blockedUid: 'alice', createdAt: 1 });
    await seed(['friendships', 'alice_bob'], { memberUids: ['alice', 'bob'], createdAt: 1 });
    await seed(['posts', 'post1'], {
      ratingId: 'post1', userId: 'bob', venueId: 'venue1', venueName: 'Good Bar', cohort: 'cocktail_bar', sentiment: 'loved',
      notes: '', mediaPaths: [], city: 'nyc', visibility: 'public', likes: 0, likedBy: [], bookmarks: 0, bookmarkedBy: [], createdAt: 1,
    });

    await assertSucceeds(getDoc(doc(dbFor('bob'), 'blocks', 'bob_alice')));
    await assertSucceeds(getDoc(doc(dbFor('alice'), 'blocks', 'bob_alice')));
    await assertSucceeds(getDoc(doc(dbFor('alice'), 'blocks', 'alice_cara')));
    await assertFails(getDoc(doc(dbFor('cara'), 'blocks', 'bob_alice')));
    await assertFails(setDoc(doc(dbFor('alice'), 'blocks', 'alice_bob'), { blockerUid: 'alice', blockedUid: 'bob', createdAt: 1 }));

    await assertFails(setDoc(doc(dbFor('alice'), 'friendRequests', 'alice_bob'), {
      fromUid: 'alice', toUid: 'bob', status: 'pending', createdAt: 2,
    }));
    await seed(['friendRequests', 'alice_bob'], { fromUid: 'alice', toUid: 'bob', status: 'pending', createdAt: 2 });
    await assertFails(updateDoc(doc(dbFor('bob'), 'friendRequests', 'alice_bob'), {
      status: 'accepted', respondedAt: 3,
    }));

    await assertFails(setDoc(doc(dbFor('alice'), 'conversations', 'dm_alice_bob'), {
      type: 'dm',
      memberUids: ['alice', 'bob'],
      createdAt: 3,
      createdByUid: 'alice',
      lastMessageAt: 3,
      lastMessage: { id: 'm1', senderUid: 'alice', type: 'text', text: 'hey', createdAt: 3 },
    }));

    await seed(['conversations', 'dm_alice_bob'], {
      type: 'dm',
      memberUids: ['alice', 'bob'],
      createdAt: 2,
      createdByUid: 'alice',
      lastMessageAt: 2,
      lastMessage: { id: 'm1', senderUid: 'alice', type: 'text', text: 'hey', createdAt: 2 },
    });

    const aliceDb = dbFor('alice');
    const batch = writeBatch(aliceDb);
    batch.update(doc(aliceDb, 'conversations', 'dm_alice_bob'), {
      lastMessageAt: 4,
      lastMessage: { id: 'm2', senderUid: 'alice', type: 'text', text: 'still there?', createdAt: 4 },
    });
    batch.set(doc(aliceDb, 'conversations', 'dm_alice_bob', 'messages', 'm2'), {
      senderUid: 'alice', type: 'text', text: 'still there?', createdAt: 4, deletedForEveryoneAt: null,
    });
    batch.set(doc(aliceDb, 'users', 'alice', 'conversationStates', 'dm_alice_bob'), { hiddenAt: null, lastSeenAt: 4 });
    batch.set(doc(aliceDb, 'users', 'bob', 'notifications', 'm2'), {
      type: 'new_direct_message', actorUid: 'alice', conversationId: 'dm_alice_bob', createdAt: 4,
    });
    await assertFails(batch.commit());

    await assertFails(setDoc(doc(dbFor('alice'), 'posts', 'post1', 'comments', 'c1'), {
      userId: 'alice', text: 'nope', createdAt: 5,
    }));
  });

  test('public Rating creation can atomically create posts projection keyed by ratingId', async () => {
    const aliceDb = dbFor('alice');
    const batch = writeBatch(aliceDb);
    batch.set(doc(aliceDb, 'ratings', 'rating1'), {
      userId: 'alice',
      username: 'alice',
      displayName: 'Alice',
      userPhotoURL: null,
      venueId: 'venue1',
      venueName: 'Good Bar',
      cohort: 'cocktail_bar',
      sentiment: 'loved',
      notes: 'great',
      mediaPaths: ['ratings/rating1/photo_1_0.jpg'],
      city: 'nyc',
      visibility: 'public',
      createdAt: 1,
    });
    batch.set(doc(aliceDb, 'posts', 'rating1'), {
      ratingId: 'rating1',
      userId: 'alice',
      username: 'alice',
      displayName: 'Alice',
      userPhotoURL: null,
      venueId: 'venue1',
      venueName: 'Good Bar',
      cohort: 'cocktail_bar',
      sentiment: 'loved',
      notes: 'great',
      mediaPaths: ['ratings/rating1/photo_1_0.jpg'],
      city: 'nyc',
      visibility: 'public',
      likes: 0,
      likedBy: [],
      bookmarks: 0,
      bookmarkedBy: [],
      createdAt: 1,
    });

    await assertSucceeds(batch.commit());
  });

  test('Post projection create is denied without a same-batch public Rating', async () => {
    await assertFails(setDoc(doc(dbFor('alice'), 'posts', 'rating1'), {
      ratingId: 'rating1',
      userId: 'alice',
      username: 'alice',
      displayName: 'Alice',
      userPhotoURL: null,
      venueId: 'venue1',
      venueName: 'Good Bar',
      cohort: 'cocktail_bar',
      sentiment: 'loved',
      notes: 'great',
      mediaPaths: [],
      city: 'nyc',
      visibility: 'public',
      likes: 0,
      likedBy: [],
      bookmarks: 0,
      bookmarkedBy: [],
      createdAt: 1,
    }));
  });

  test('signed-in users can toggle only their own Post like with derived count', async () => {
    await seed(['posts', 'rating1'], {
      ratingId: 'rating1',
      userId: 'alice',
      venueId: 'venue1',
      venueName: 'Good Bar',
      cohort: 'cocktail_bar',
      sentiment: 'loved',
      notes: 'great',
      mediaPaths: [],
      city: 'nyc',
      visibility: 'public',
      likes: 0,
      likedBy: [],
      bookmarks: 0,
      bookmarkedBy: [],
      createdAt: 1,
    });

    await assertSucceeds(updateDoc(doc(dbFor('bob'), 'posts', 'rating1'), {
      likes: 1,
      likedBy: ['bob'],
    }));

    await assertSucceeds(updateDoc(doc(dbFor('bob'), 'posts', 'rating1'), {
      likes: 0,
      likedBy: [],
    }));

    await assertFails(updateDoc(doc(dbFor('bob'), 'posts', 'rating1'), {
      likes: 1,
      likedBy: ['cara'],
    }));

    await assertFails(updateDoc(doc(dbFor('bob'), 'posts', 'rating1'), {
      likes: 2,
      likedBy: ['bob'],
    }));
  });

  test('signed-in users can toggle only their own saved-review bookmark', async () => {
    await seed(['posts', 'rating1'], {
      ratingId: 'rating1',
      userId: 'alice',
      venueId: 'venue1',
      venueName: 'Good Bar',
      cohort: 'cocktail_bar',
      sentiment: 'loved',
      notes: 'great',
      mediaPaths: [],
      city: 'nyc',
      visibility: 'public',
      likes: 1,
      likedBy: ['alice'],
      bookmarks: 0,
      bookmarkedBy: [],
      createdAt: 1,
    });

    await assertSucceeds(updateDoc(doc(dbFor('bob'), 'posts', 'rating1'), {
      bookmarks: 1,
      bookmarkedBy: ['bob'],
    }));

    await assertFails(updateDoc(doc(dbFor('bob'), 'posts', 'rating1'), {
      likes: 0,
      likedBy: [],
      bookmarks: 1,
      bookmarkedBy: ['bob'],
    }));

    await assertFails(updateDoc(doc(dbFor('bob'), 'posts', 'rating1'), {
      bookmarks: 1,
      bookmarkedBy: ['bob'],
      venueName: 'Changed',
    }));
  });

  test('private and unlisted Ratings are owner-readable only and cannot create public Posts', async () => {
    await seed(['ratings', 'private1'], {
      userId: 'alice', venueId: 'venue1', venueName: 'Good Bar', cohort: 'cocktail_bar', sentiment: 'fine',
      notes: '', mediaPaths: [], city: 'nyc', visibility: 'private', createdAt: 1,
    });
    await seed(['ratings', 'unlisted1'], {
      userId: 'alice', venueId: 'venue1', venueName: 'Good Bar', cohort: 'cocktail_bar', sentiment: 'fine',
      notes: '', mediaPaths: [], city: 'nyc', visibility: 'unlisted', createdAt: 1,
    });

    await assertSucceeds(getDoc(doc(dbFor('alice'), 'ratings', 'private1')));
    await assertFails(getDoc(doc(dbFor('bob'), 'ratings', 'private1')));
    await assertFails(getDoc(doc(dbFor('bob'), 'ratings', 'unlisted1')));

    const aliceDb = dbFor('alice');
    const batch = writeBatch(aliceDb);
    batch.set(doc(aliceDb, 'ratings', 'private2'), {
      userId: 'alice', venueId: 'venue1', venueName: 'Good Bar', cohort: 'cocktail_bar', sentiment: 'fine',
      notes: '', mediaPaths: [], city: 'nyc', visibility: 'private', createdAt: 1,
    });
    batch.set(doc(aliceDb, 'posts', 'private2'), {
      ratingId: 'private2', userId: 'alice', venueId: 'venue1', venueName: 'Good Bar', cohort: 'cocktail_bar', sentiment: 'fine',
      notes: '', mediaPaths: [], city: 'nyc', visibility: 'public', likes: 0, likedBy: [], bookmarks: 0, bookmarkedBy: [], createdAt: 1,
    });
    await assertFails(batch.commit());
  });

  test('active group member can send review_link message with required fields', async () => {
    await seed(['conversations', 'group2'], {
      type: 'group',
      memberUids: ['alice', 'bob'],
      adminUid: 'alice',
      name: 'Test Group',
      createdAt: 1,
      createdByUid: 'alice',
      lastMessageAt: null,
      lastMessage: null,
      archivedAt: null,
    });
    await seed(['conversations', 'group2', 'members', 'alice'], {
      uid: 'alice', role: 'admin', joinedAt: 1, leftAt: null, invitedByUid: null,
    });
    await seed(['conversations', 'group2', 'members', 'bob'], {
      uid: 'bob', role: 'member', joinedAt: 1, leftAt: null, invitedByUid: 'alice',
    });

    await assertSucceeds(setDoc(doc(dbFor('alice'), 'conversations', 'group2', 'messages', 'rev1'), {
      senderUid: 'alice',
      type: 'review_link',
      ratingId: 'rating1',
      venueId: 'venue1',
      venueName: 'Good Bar',
      venueCohort: 'cocktail_bar',
      sentiment: 'loved',
      authorDisplayName: 'Alice',
      authorUsername: 'alice',
      notes: 'Great place',
      createdAt: 2,
      deletedForEveryoneAt: null,
    }));
  });

  test('non-member cannot send review_link message', async () => {
    await seed(['conversations', 'group3'], {
      type: 'group',
      memberUids: ['alice'],
      adminUid: 'alice',
      name: 'Solo',
      createdAt: 1,
      createdByUid: 'alice',
      lastMessageAt: null,
      lastMessage: null,
      archivedAt: null,
    });
    await seed(['conversations', 'group3', 'members', 'alice'], {
      uid: 'alice', role: 'admin', joinedAt: 1, leftAt: null, invitedByUid: null,
    });

    await assertFails(setDoc(doc(dbFor('bob'), 'conversations', 'group3', 'messages', 'rev1'), {
      senderUid: 'bob',
      type: 'review_link',
      ratingId: 'rating1',
      venueId: 'venue1',
      venueName: 'Good Bar',
      venueCohort: 'cocktail_bar',
      sentiment: 'loved',
      authorDisplayName: 'Bob',
      authorUsername: 'bob',
      notes: '',
      createdAt: 2,
      deletedForEveryoneAt: null,
    }));
  });

  test('invalid review_link shape is denied', async () => {
    await seed(['conversations', 'group4'], {
      type: 'group',
      memberUids: ['alice'],
      adminUid: 'alice',
      name: 'Solo',
      createdAt: 1,
      createdByUid: 'alice',
      lastMessageAt: null,
      lastMessage: null,
      archivedAt: null,
    });
    await seed(['conversations', 'group4', 'members', 'alice'], {
      uid: 'alice', role: 'admin', joinedAt: 1, leftAt: null, invitedByUid: null,
    });

    // Missing venueName
    await assertFails(setDoc(doc(dbFor('alice'), 'conversations', 'group4', 'messages', 'rev1'), {
      senderUid: 'alice',
      type: 'review_link',
      ratingId: 'rating1',
      venueId: 'venue1',
      venueCohort: 'cocktail_bar',
      sentiment: 'loved',
      createdAt: 2,
      deletedForEveryoneAt: null,
    }));

    // Invalid sentiment
    await assertFails(setDoc(doc(dbFor('alice'), 'conversations', 'group4', 'messages', 'rev2'), {
      senderUid: 'alice',
      type: 'review_link',
      ratingId: 'rating1',
      venueId: 'venue1',
      venueName: 'Good Bar',
      venueCohort: 'cocktail_bar',
      sentiment: 'amazing',
      createdAt: 2,
      deletedForEveryoneAt: null,
    }));
  });

  test('Rating create allows optional companionUids up to 25 members', async () => {
    const aliceDb = dbFor('alice');
    const batch = writeBatch(aliceDb);
    batch.set(doc(aliceDb, 'ratings', 'ratingWithCompanions'), {
      userId: 'alice',
      username: 'alice',
      displayName: 'Alice',
      userPhotoURL: null,
      venueId: 'venue1',
      venueName: 'Good Bar',
      cohort: 'cocktail_bar',
      sentiment: 'loved',
      notes: '',
      mediaPaths: [],
      companionUids: ['bob', 'cara'],
      city: 'nyc',
      visibility: 'public',
      createdAt: 1,
    });
    batch.set(doc(aliceDb, 'posts', 'ratingWithCompanions'), {
      ratingId: 'ratingWithCompanions',
      userId: 'alice',
      username: 'alice',
      displayName: 'Alice',
      userPhotoURL: null,
      venueId: 'venue1',
      venueName: 'Good Bar',
      cohort: 'cocktail_bar',
      sentiment: 'loved',
      notes: '',
      mediaPaths: [],
      companionUids: ['bob', 'cara'],
      city: 'nyc',
      visibility: 'public',
      likes: 0,
      likedBy: [],
      bookmarks: 0,
      bookmarkedBy: [],
      createdAt: 1,
    });
    await assertSucceeds(batch.commit());
  });

  test('Rating create rejects non-array companionUids', async () => {
    await assertFails(setDoc(doc(dbFor('alice'), 'ratings', 'badCompanions'), {
      userId: 'alice', username: 'alice', displayName: 'Alice', userPhotoURL: null,
      venueId: 'venue1', venueName: 'Good Bar', cohort: 'cocktail_bar', sentiment: 'loved',
      notes: '', mediaPaths: [], city: 'nyc', visibility: 'public', createdAt: 1,
      companionUids: 'not-an-array',
    }));
  });

  test('Rating and Post rules deny legacy fields, projection edits, and reviews writes', async () => {
    await assertFails(setDoc(doc(dbFor('alice'), 'ratings', 'badRating'), {
      userId: 'alice', ratingId: 'badRating', venueId: 'venue1', venueName: 'Good Bar', cohort: 'cocktail_bar', sentiment: 'loved',
      notes: 'great', mediaPaths: [], city: 'nyc', visibility: 'public', likes: 0, createdAt: 1,
    }));

    await seed(['ratings', 'rating1'], {
      userId: 'alice', venueId: 'venue1', venueName: 'Good Bar', cohort: 'cocktail_bar', sentiment: 'loved',
      notes: 'great', mediaPaths: [], city: 'nyc', visibility: 'public', createdAt: 1,
    });
    await seed(['posts', 'rating1'], {
      ratingId: 'rating1', userId: 'alice', venueId: 'venue1', venueName: 'Good Bar', cohort: 'cocktail_bar', sentiment: 'loved',
      notes: 'great', mediaPaths: [], city: 'nyc', visibility: 'public', likes: 0, likedBy: [], bookmarks: 0, bookmarkedBy: [], createdAt: 1,
    });

    await assertFails(updateDoc(doc(dbFor('alice'), 'ratings', 'rating1'), { notes: 'edited' }));
    await assertFails(updateDoc(doc(dbFor('alice'), 'posts', 'rating1'), { notes: 'edited' }));
    await assertFails(setDoc(doc(dbFor('alice'), 'reviews', 'review1'), { userId: 'alice', notes: 'legacy fork' }));
  });

  test('unlisted Rating is readable by owner and users with active share', async () => {
    await seed(['ratings', 'unlisted1'], {
      userId: 'alice', venueId: 'venue1', venueName: 'Good Bar', cohort: 'cocktail_bar', sentiment: 'loved',
      notes: '', mediaPaths: [], city: 'nyc', visibility: 'unlisted', createdAt: 1,
    });
    await seed(['users', 'bob', 'sharedRatings', 'unlisted1'], {
      ratingId: 'unlisted1', conversationId: 'conv1', grantedAt: 1, revokedAt: null,
    });

    // Owner can read
    await assertSucceeds(getDoc(doc(dbFor('alice'), 'ratings', 'unlisted1')));
    // User with active share can read
    await assertSucceeds(getDoc(doc(dbFor('bob'), 'ratings', 'unlisted1')));
  });

  test('unlisted Rating is not readable by user without share or revoked share', async () => {
    await seed(['ratings', 'unlisted2'], {
      userId: 'alice', venueId: 'venue1', venueName: 'Good Bar', cohort: 'cocktail_bar', sentiment: 'loved',
      notes: '', mediaPaths: [], city: 'nyc', visibility: 'unlisted', createdAt: 1,
    });
    await seed(['users', 'cara', 'sharedRatings', 'unlisted2'], {
      ratingId: 'unlisted2', conversationId: 'conv1', grantedAt: 1, revokedAt: 2,
    });

    // User without share cannot read
    await assertFails(getDoc(doc(dbFor('bob'), 'ratings', 'unlisted2')));
    // User with revoked share cannot read
    await assertFails(getDoc(doc(dbFor('cara'), 'ratings', 'unlisted2')));
  });

  test('private Rating is readable only by owner', async () => {
    await seed(['ratings', 'private1'], {
      userId: 'alice', venueId: 'venue1', venueName: 'Good Bar', cohort: 'cocktail_bar', sentiment: 'loved',
      notes: '', mediaPaths: [], city: 'nyc', visibility: 'private', createdAt: 1,
    });

    await assertSucceeds(getDoc(doc(dbFor('alice'), 'ratings', 'private1')));
    await assertFails(getDoc(doc(dbFor('bob'), 'ratings', 'private1')));
  });

  test('sharedRatings is owner-read-only', async () => {
    await seed(['users', 'alice', 'sharedRatings', 'rating1'], {
      ratingId: 'rating1', conversationId: 'conv1', grantedAt: 1, revokedAt: null,
    });

    await assertSucceeds(getDoc(doc(dbFor('alice'), 'users', 'alice', 'sharedRatings', 'rating1')));
    await assertFails(getDoc(doc(dbFor('bob'), 'users', 'alice', 'sharedRatings', 'rating1')));
    await assertFails(setDoc(doc(dbFor('alice'), 'users', 'alice', 'sharedRatings', 'rating2'), {
      ratingId: 'rating2', conversationId: 'conv1', grantedAt: 1, revokedAt: null,
    }));
  });
});
