const {
  GroupLifecycleError,
  inviteToGroupCallable,
  leaveGroupCallable,
  removeGroupMemberCallable,
} = require('../group-lifecycle');

class FakeDocSnap {
  constructor(data) { this.exists = data !== undefined; this._data = data; }
  data() { return this._data; }
}

class FakeDocRef {
  constructor(db, path) { this.db = db; this.path = path; this.id = path.split('/').pop(); }
  collection(name) { return new FakeCollectionRef(this.db, `${this.path}/${name}`); }
  async get() { return new FakeDocSnap(this.db.data[this.path]); }
}

class FakeCollectionRef {
  constructor(db, path) { this.db = db; this.path = path; }
  doc(id) { return new FakeDocRef(this.db, `${this.path}/${id}`); }
}

class FakeBatch {
  constructor(db) { this.db = db; this.ops = []; }
  set(ref, data) { this.ops.push({ type: 'set', path: ref.path, data }); }
  update(ref, data) { this.ops.push({ type: 'update', path: ref.path, data }); }
  async commit() {
    this.ops.forEach((op) => {
      if (op.type === 'update') this.db.data[op.path] = { ...(this.db.data[op.path] || {}), ...op.data };
      else this.db.data[op.path] = op.data;
    });
  }
}

class FakeDb {
  constructor(seed = {}) { this.data = { ...seed }; }
  collection(path) { return new FakeCollectionRef(this, path); }
  batch() { return new FakeBatch(this); }
}

function group(overrides = {}) {
  return {
    type: 'group',
    memberUids: ['alice', 'bob', 'cara'],
    adminUid: 'alice',
    name: 'Birthday',
    archivedAt: null,
    ...overrides,
  };
}

function member(uid, overrides = {}) {
  return { uid, role: uid === 'alice' ? 'admin' : 'member', joinedAt: 1, leftAt: null, invitedByUid: null, ...overrides };
}

function friendship(uidA, uidB) {
  return [`friendships/${[uidA, uidB].sort().join('_')}`, { memberUids: [uidA, uidB].sort() }];
}

function seedBase(extra = {}) {
  return {
    'conversations/group1': group(),
    'conversations/group1/members/alice': member('alice'),
    'conversations/group1/members/bob': member('bob'),
    'conversations/group1/members/cara': member('cara'),
    ...extra,
  };
}

describe('group lifecycle callable core', () => {
  test('invite rejects non-admin, active member, non-friend, and cap overflow', async () => {
    await expect(inviteToGroupCallable({ auth: { uid: 'bob' }, data: { conversationId: 'group1', selectedMemberUids: ['dana'] } }, {
      db: new FakeDb(seedBase()), now: () => 10, ErrorClass: GroupLifecycleError,
    })).rejects.toMatchObject({ code: 'permission-denied' });

    await expect(inviteToGroupCallable({ auth: { uid: 'alice' }, data: { conversationId: 'group1', selectedMemberUids: ['bob'] } }, {
      db: new FakeDb(seedBase()), now: () => 10, ErrorClass: GroupLifecycleError,
    })).rejects.toMatchObject({ code: 'failed-precondition' });

    await expect(inviteToGroupCallable({ auth: { uid: 'alice' }, data: { conversationId: 'group1', selectedMemberUids: ['dana'] } }, {
      db: new FakeDb(seedBase()), now: () => 10, ErrorClass: GroupLifecycleError,
    })).rejects.toMatchObject({ code: 'permission-denied' });

    const fullMembers = Array.from({ length: 25 }, (_, index) => `u${index}`);
    await expect(inviteToGroupCallable({ auth: { uid: 'u0' }, data: { conversationId: 'group1', selectedMemberUids: ['newbie'] } }, {
      db: new FakeDb(seedBase({
        'conversations/group1': group({ memberUids: fullMembers, adminUid: 'u0' }),
        'conversations/group1/members/u0': member('u0', { role: 'admin' }),
        ...Object.fromEntries([friendship('u0', 'newbie')]),
      })), now: () => 10, ErrorClass: GroupLifecycleError,
    })).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  test('invite adds and re-adds Friends without partial writes', async () => {
    const db = new FakeDb(seedBase({
      ...Object.fromEntries([friendship('alice', 'dana'), friendship('alice', 'erin')]),
      'conversations/group1/members/erin': member('erin', { leftAt: 5 }),
    }));

    await expect(inviteToGroupCallable({
      auth: { uid: 'alice' },
      data: { conversationId: 'group1', selectedMemberUids: ['erin', 'dana'] },
    }, { db, now: () => 10, ErrorClass: GroupLifecycleError })).resolves.toEqual({ conversationId: 'group1', addedMemberUids: ['dana', 'erin'] });

    expect(db.data['conversations/group1'].memberUids).toEqual(['alice', 'bob', 'cara', 'dana', 'erin']);
    expect(db.data['conversations/group1/members/dana']).toEqual({ uid: 'dana', role: 'member', joinedAt: 10, leftAt: null, invitedByUid: 'alice' });
    expect(db.data['conversations/group1/members/erin']).toEqual({ uid: 'erin', role: 'member', joinedAt: 10, leftAt: null, invitedByUid: 'alice' });
    expect(db.data['users/dana/conversationStates/group1']).toEqual({ hiddenAt: null });
    expect(db.data['users/erin/notifications/group1_added']).toEqual({ type: 'added_to_group', actorUid: 'alice', conversationId: 'group1', createdAt: 10 });
  });

  test('remove rejects non-admin, self, non-member; succeeds silently for member', async () => {
    await expect(removeGroupMemberCallable({ auth: { uid: 'bob' }, data: { conversationId: 'group1', memberUid: 'cara' } }, {
      db: new FakeDb(seedBase()), now: () => 10, ErrorClass: GroupLifecycleError,
    })).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(removeGroupMemberCallable({ auth: { uid: 'alice' }, data: { conversationId: 'group1', memberUid: 'alice' } }, {
      db: new FakeDb(seedBase()), now: () => 10, ErrorClass: GroupLifecycleError,
    })).rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(removeGroupMemberCallable({ auth: { uid: 'alice' }, data: { conversationId: 'group1', memberUid: 'dana' } }, {
      db: new FakeDb(seedBase()), now: () => 10, ErrorClass: GroupLifecycleError,
    })).rejects.toMatchObject({ code: 'failed-precondition' });

    const db = new FakeDb(seedBase());
    await expect(removeGroupMemberCallable({ auth: { uid: 'alice' }, data: { conversationId: 'group1', memberUid: 'bob' } }, {
      db, now: () => 10, ErrorClass: GroupLifecycleError,
    })).resolves.toEqual({ conversationId: 'group1', removedMemberUid: 'bob' });
    expect(db.data['conversations/group1'].memberUids).toEqual(['alice', 'cara']);
    expect(db.data['conversations/group1/members/bob'].leftAt).toBe(10);
    expect(db.data['conversations/group1'].lastMessageAt).toBeUndefined();
  });

  test('leave handles non-admin leave, admin transfer, and last-member archive', async () => {
    const nonAdminDb = new FakeDb(seedBase());
    await leaveGroupCallable({ auth: { uid: 'bob' }, data: { conversationId: 'group1' } }, { db: nonAdminDb, now: () => 10, ErrorClass: GroupLifecycleError });
    expect(nonAdminDb.data['conversations/group1'].memberUids).toEqual(['alice', 'cara']);
    expect(nonAdminDb.data['conversations/group1'].adminUid).toBe('alice');

    await expect(leaveGroupCallable({ auth: { uid: 'alice' }, data: { conversationId: 'group1' } }, {
      db: new FakeDb(seedBase()), now: () => 10, ErrorClass: GroupLifecycleError,
    })).rejects.toMatchObject({ code: 'failed-precondition' });

    const adminDb = new FakeDb(seedBase());
    await leaveGroupCallable({ auth: { uid: 'alice' }, data: { conversationId: 'group1', nextAdminUid: 'bob' } }, { db: adminDb, now: () => 10, ErrorClass: GroupLifecycleError });
    expect(adminDb.data['conversations/group1'].memberUids).toEqual(['bob', 'cara']);
    expect(adminDb.data['conversations/group1'].adminUid).toBe('bob');
    expect(adminDb.data['conversations/group1/members/bob'].role).toBe('admin');
    expect(adminDb.data['conversations/group1/members/alice'].leftAt).toBe(10);

    const lastDb = new FakeDb(seedBase({
      'conversations/group1': group({ memberUids: ['alice'] }),
      'conversations/group1/members/bob': member('bob', { leftAt: 5 }),
      'conversations/group1/members/cara': member('cara', { leftAt: 5 }),
    }));
    await leaveGroupCallable({ auth: { uid: 'alice' }, data: { conversationId: 'group1' } }, { db: lastDb, now: () => 10, ErrorClass: GroupLifecycleError });
    expect(lastDb.data['conversations/group1'].memberUids).toEqual([]);
    expect(lastDb.data['conversations/group1'].adminUid).toBe(null);
    expect(lastDb.data['conversations/group1'].archivedAt).toBe(10);
  });
});
