const {
  GroupCreateError,
  buildGroupCreateDocuments,
  createGroupConversationCallable,
} = require('../group-create');

class FakeDocSnap {
  constructor(data) { this.exists = data !== undefined; this._data = data; }
  data() { return this._data; }
}

class FakeDocRef {
  constructor(db, path) { this.db = db; this.path = path; this.id = path.split('/').pop(); }
  collection(name) { return new FakeCollectionRef(this.db, `${this.path}/${name}`); }
  async get() { return new FakeDocSnap(this.db.seeded[this.path]); }
}

class FakeCollectionRef {
  constructor(db, path) { this.db = db; this.path = path; }
  doc(id) {
    const docId = id || `auto${++this.db.autoId}`;
    return new FakeDocRef(this.db, `${this.path}/${docId}`);
  }
}

class FakeBatch {
  constructor(db) { this.db = db; this.ops = []; }
  set(ref, data) { this.ops.push({ path: ref.path, data }); }
  async commit() { this.ops.forEach((op) => { this.db.writes[op.path] = op.data; }); }
}

class FakeDb {
  constructor(seed = {}) { this.seeded = seed; this.writes = {}; this.autoId = 0; }
  collection(path) { return new FakeCollectionRef(this, path); }
  batch() { return new FakeBatch(this); }
}

function friendship(uidA, uidB) {
  return [`friendships/${[uidA, uidB].sort().join('_')}`, { memberUids: [uidA, uidB].sort() }];
}

describe('createGroupConversation callable core', () => {
  test('builds group create documents for conversation, members, states, and notifications', () => {
    expect(buildGroupCreateDocuments({
      conversationId: 'group1',
      creatorUid: 'alice',
      selectedMemberUids: ['cara', 'bob'],
      name: 'Birthday',
      createdAt: 10,
    })).toMatchObject({
      conversation: {
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
      },
      members: {
        alice: { uid: 'alice', role: 'admin', joinedAt: 10, leftAt: null, invitedByUid: null },
        bob: { uid: 'bob', role: 'member', joinedAt: 10, leftAt: null, invitedByUid: 'alice' },
        cara: { uid: 'cara', role: 'member', joinedAt: 10, leftAt: null, invitedByUid: 'alice' },
      },
      states: {
        alice: { hiddenAt: null, lastSeenAt: 10 },
        bob: { hiddenAt: null },
        cara: { hiddenAt: null },
      },
    });
  });

  test('rejects unauthenticated, invalid name, invalid count, and non-friend selected members', async () => {
    const db = new FakeDb(Object.fromEntries([friendship('alice', 'bob')]));

    await expect(createGroupConversationCallable({ auth: null, data: {} }, { db, now: () => 10, ErrorClass: GroupCreateError }))
      .rejects.toMatchObject({ code: 'unauthenticated' });
    await expect(createGroupConversationCallable({ auth: { uid: 'alice' }, data: { name: '', selectedMemberUids: ['bob', 'cara'] } }, { db, now: () => 10, ErrorClass: GroupCreateError }))
      .rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(createGroupConversationCallable({ auth: { uid: 'alice' }, data: { name: 'Tiny', selectedMemberUids: ['bob'] } }, { db, now: () => 10, ErrorClass: GroupCreateError }))
      .rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(createGroupConversationCallable({ auth: { uid: 'alice' }, data: { name: 'Group', selectedMemberUids: ['bob', 'cara'] } }, { db, now: () => 10, ErrorClass: GroupCreateError }))
      .rejects.toMatchObject({ code: 'permission-denied' });
  });

  test('rejects group creation when creator or selected Friend has blocked the other', async () => {
    const db = new FakeDb(Object.fromEntries([
      friendship('alice', 'bob'),
      friendship('alice', 'cara'),
      ['blocks/cara_alice', { blockerUid: 'cara', blockedUid: 'alice', createdAt: 1 }],
    ]));

    await expect(createGroupConversationCallable({
      auth: { uid: 'alice' },
      data: { name: 'Blocked group', selectedMemberUids: ['bob', 'cara'] },
    }, { db, now: () => 10, ErrorClass: GroupCreateError }))
      .rejects.toMatchObject({ code: 'permission-denied' });
  });

  test('writes group conversation and returns only conversation id', async () => {
    const db = new FakeDb(Object.fromEntries([
      friendship('alice', 'bob'),
      friendship('alice', 'cara'),
    ]));

    await expect(createGroupConversationCallable({
      auth: { uid: 'alice' },
      data: { name: ' Birthday ', selectedMemberUids: ['cara', 'bob'] },
    }, { db, now: () => 10, ErrorClass: GroupCreateError })).resolves.toEqual({ conversationId: 'auto1' });

    expect(db.writes['conversations/auto1'].name).toBe('Birthday');
    expect(db.writes['conversations/auto1/members/alice'].role).toBe('admin');
    expect(db.writes['users/bob/conversationStates/auto1']).toEqual({ hiddenAt: null });
    expect(db.writes['users/cara/notifications/auto1_added']).toEqual({
      type: 'added_to_group',
      actorUid: 'alice',
      conversationId: 'auto1',
      createdAt: 10,
    });
  });
});
