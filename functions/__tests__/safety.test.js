const {
  SafetyError,
  blockUserCallable,
  deleteMessageForEveryoneCallable,
} = require('../safety');

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
  set(ref, data, options) { this.ops.push({ type: 'set', path: ref.path, data, options }); }
  update(ref, data) { this.ops.push({ type: 'update', path: ref.path, data }); }
  delete(ref) { this.ops.push({ type: 'delete', path: ref.path }); }
  async commit() {
    this.ops.forEach((op) => {
      if (op.type === 'delete') delete this.db.data[op.path];
      if (op.type === 'set') this.db.data[op.path] = op.options?.merge ? { ...(this.db.data[op.path] || {}), ...op.data } : op.data;
      if (op.type === 'update') {
        const current = { ...(this.db.data[op.path] || {}) };
        Object.entries(op.data).forEach(([key, value]) => {
          if (value && value.__op === 'arrayRemove') {
            current[key] = Array.isArray(current[key]) ? current[key].filter((item) => !value.values.includes(item)) : [];
          } else {
            current[key] = value;
          }
        });
        this.db.data[op.path] = current;
      }
    });
  }
}

class FakeDb {
  constructor(seed = {}) { this.data = { ...seed }; }
  collection(path) { return new FakeCollectionRef(this, path); }
  batch() { return new FakeBatch(this); }
}

const fieldValue = {
  arrayRemove: (...values) => ({ __op: 'arrayRemove', values }),
};

function deps(db) {
  return { db, now: () => 10, FieldValue: fieldValue, ErrorClass: SafetyError };
}

describe('safety callable core', () => {
  test('block creates block, removes Friendship/follows, cancels requests, and hides blocker DM', async () => {
    const db = new FakeDb({
      'users/alice': { uid: 'alice', followers: ['bob'], following: ['bob'] },
      'users/bob': { uid: 'bob', followers: ['alice'], following: ['alice'] },
      'friendships/alice_bob': { memberUids: ['alice', 'bob'], createdAt: 1 },
      'friendRequests/alice_bob': { fromUid: 'alice', toUid: 'bob', status: 'pending', createdAt: 1 },
      'friendRequests/bob_alice': { fromUid: 'bob', toUid: 'alice', status: 'pending', createdAt: 2 },
      'conversations/dm_alice_bob': { type: 'dm', memberUids: ['alice', 'bob'] },
    });

    await expect(blockUserCallable({ auth: { uid: 'alice' }, data: { blockedUid: 'bob' } }, deps(db)))
      .resolves.toEqual({ blockedUid: 'bob' });

    expect(db.data['blocks/alice_bob']).toEqual({ blockerUid: 'alice', blockedUid: 'bob', createdAt: 10 });
    expect(db.data['friendships/alice_bob']).toBeUndefined();
    expect(db.data['users/alice']).toEqual({ uid: 'alice', followers: [], following: [] });
    expect(db.data['users/bob']).toEqual({ uid: 'bob', followers: [], following: [] });
    expect(db.data['friendRequests/alice_bob'].status).toBe('canceled');
    expect(db.data['friendRequests/bob_alice'].status).toBe('canceled');
    expect(db.data['users/alice/conversationStates/dm_alice_bob']).toEqual({ hiddenAt: 10 });
  });

  test('delete for everyone only lets sender tombstone a message and last-message preview', async () => {
    await expect(deleteMessageForEveryoneCallable({ auth: { uid: 'bob' }, data: { conversationId: 'dm_alice_bob', messageId: 'm1' } }, deps(new FakeDb({
      'conversations/dm_alice_bob': { type: 'dm', memberUids: ['alice', 'bob'] },
      'conversations/dm_alice_bob/messages/m1': { senderUid: 'alice', type: 'text', text: 'hey', createdAt: 1, deletedForEveryoneAt: null },
    })))).rejects.toMatchObject({ code: 'permission-denied' });

    const db = new FakeDb({
      'conversations/dm_alice_bob': {
        type: 'dm',
        memberUids: ['alice', 'bob'],
        lastMessageAt: 1,
        lastMessage: { id: 'm1', senderUid: 'alice', type: 'text', text: 'hey', createdAt: 1 },
      },
      'conversations/dm_alice_bob/messages/m1': { senderUid: 'alice', type: 'text', text: 'hey', createdAt: 1, deletedForEveryoneAt: null },
    });

    await expect(deleteMessageForEveryoneCallable({ auth: { uid: 'alice' }, data: { conversationId: 'dm_alice_bob', messageId: 'm1' } }, deps(db)))
      .resolves.toEqual({ conversationId: 'dm_alice_bob', messageId: 'm1' });

    expect(db.data['conversations/dm_alice_bob/messages/m1'].deletedForEveryoneAt).toBe(10);
    expect(db.data['conversations/dm_alice_bob'].lastMessage).toEqual({
      id: 'm1', senderUid: 'alice', type: 'text', text: 'hey', createdAt: 1, deletedForEveryoneAt: 10,
    });
  });
});
