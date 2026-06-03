const {
  buildDirectMessageWrites,
  buildGroupMessageWrites,
  executeDirectMessageSend,
  executeGroupMessageSend,
} = require('../friends/message-send-service');

describe('Message send service contracts', () => {
  test('first DM send builds conversation, members, sender/recipient states, notification, message doc', () => {
    const writes = buildDirectMessageWrites({
      senderUid: 'bob',
      recipientUid: 'alice',
      message: { senderUid: 'bob', type: 'text', text: 'meet at 9?', createdAt: 10, deletedForEveryoneAt: null },
      lastMessage: { id: 'm1', senderUid: 'bob', type: 'text', text: 'meet at 9?', createdAt: 10 },
      messageId: 'm1',
      createdAt: 10,
      isFirstMessage: true,
    });

    expect(writes.conversationId).toBe('dm_alice_bob');
    expect(writes.conversation).toEqual({
      type: 'dm',
      memberUids: ['alice', 'bob'],
      createdAt: 10,
      createdByUid: 'bob',
      lastMessageAt: 10,
      lastMessage: {
        id: 'm1',
        senderUid: 'bob',
        type: 'text',
        text: 'meet at 9?',
        createdAt: 10,
      },
    });
    expect(writes.members).toEqual({
      alice: { uid: 'alice', role: 'member', joinedAt: 10, leftAt: null },
      bob: { uid: 'bob', role: 'member', joinedAt: 10, leftAt: null },
    });
    expect(writes.message).toEqual({
      senderUid: 'bob',
      type: 'text',
      text: 'meet at 9?',
      createdAt: 10,
      deletedForEveryoneAt: null,
    });
    expect(writes.senderState).toEqual({ hiddenAt: null, lastSeenAt: 10 });
    expect(writes.recipientState).toEqual({ hiddenAt: null });
    expect(writes.recipientNotification).toEqual({
      type: 'new_direct_message',
      actorUid: 'bob',
      conversationId: 'dm_alice_bob',
      createdAt: 10,
    });
  });

  test('existing DM send updates conversation and sender state only', () => {
    const writes = buildDirectMessageWrites({
      senderUid: 'alice',
      recipientUid: 'bob',
      message: { senderUid: 'alice', type: 'text', text: 'omw', createdAt: 20, deletedForEveryoneAt: null },
      lastMessage: { id: 'm2', senderUid: 'alice', type: 'text', text: 'omw', createdAt: 20 },
      messageId: 'm2',
      createdAt: 20,
      isFirstMessage: false,
    });

    expect(writes.conversationId).toBe('dm_alice_bob');
    expect(writes.conversation).toEqual({
      lastMessageAt: 20,
      lastMessage: {
        id: 'm2',
        senderUid: 'alice',
        type: 'text',
        text: 'omw',
        createdAt: 20,
      },
    });
    expect(writes.members).toBeNull();
    expect(writes.senderState).toEqual({ hiddenAt: null, lastSeenAt: 20 });
    expect(writes.recipientState).toBeNull();
    expect(writes.recipientNotification).toEqual({
      type: 'new_direct_message',
      actorUid: 'alice',
      conversationId: 'dm_alice_bob',
      createdAt: 20,
    });
  });

  test('group send updates conversation, message doc, sender state, notifications for other active members', () => {
    const writes = buildGroupMessageWrites({
      conversationId: 'group1',
      memberUids: ['alice', 'bob', 'cara'],
      senderUid: 'alice',
      message: { senderUid: 'alice', type: 'text', text: 'where first?', createdAt: 10, deletedForEveryoneAt: null },
      lastMessage: { id: 'm1', senderUid: 'alice', type: 'text', text: 'where first?', createdAt: 10 },
      messageId: 'm1',
      createdAt: 10,
    });

    expect(writes.conversationUpdate).toEqual({
      lastMessageAt: 10,
      lastMessage: {
        id: 'm1',
        senderUid: 'alice',
        type: 'text',
        text: 'where first?',
        createdAt: 10,
      },
    });
    expect(writes.message).toEqual({
      senderUid: 'alice',
      type: 'text',
      text: 'where first?',
      createdAt: 10,
      deletedForEveryoneAt: null,
    });
    expect(writes.senderState).toEqual({ hiddenAt: null, lastSeenAt: 10 });
    expect(writes.recipientNotifications).toEqual({
      bob: { type: 'new_group_message', actorUid: 'alice', conversationId: 'group1', createdAt: 10 },
      cara: { type: 'new_group_message', actorUid: 'alice', conversationId: 'group1', createdAt: 10 },
    });
  });

  test('reply metadata stored on message only; lastMessage unaffected', () => {
    const writes = buildDirectMessageWrites({
      senderUid: 'alice',
      recipientUid: 'bob',
      message: {
        senderUid: 'alice',
        type: 'text',
        text: 'agree',
        replyToMessageId: 'm1',
        replyToPreview: { senderUid: 'bob', type: 'text', snippet: 'where first?' },
        createdAt: 20,
        deletedForEveryoneAt: null,
      },
      lastMessage: { id: 'm2', senderUid: 'alice', type: 'text', text: 'agree', createdAt: 20 },
      messageId: 'm2',
      createdAt: 20,
      isFirstMessage: false,
    });

    expect(writes.message).toMatchObject({
      replyToMessageId: 'm1',
      replyToPreview: { senderUid: 'bob', type: 'text', snippet: 'where first?' },
    });
    expect(writes.conversation.lastMessage).not.toHaveProperty('replyToMessageId');
  });

  test('media upload success then batch commit', async () => {
    const committedDocs = [];
    const api = {
      serverTimestamp: () => 100,
      doc: (_db, ...path) => {
        const p = path.join('/');
        return { path: p, id: path[path.length - 1] || 'msg_auto_id' };
      },
      collection: (parent) => ({ parent, id: 'messages' }),
      writeBatch: () => ({
        set: (ref, data, opts) => committedDocs.push({ op: 'set', ref: ref.path, data, opts }),
        update: (ref, data) => committedDocs.push({ op: 'update', ref: ref.path, data }),
        commit: async () => {},
      }),
      getDoc: async () => ({ exists: () => true }),
    };

    const adapter = {
      async prepare({ conversationId, messageId, createdAt }) {
        return { success: true, context: { uploaded: true } };
      },
      buildPayload({ messageId, createdAt, context }) {
        return {
          message: { senderUid: 'alice', type: 'photo', mediaPaths: ['a.jpg'], createdAt },
          lastMessage: { id: messageId, senderUid: 'alice', type: 'photo', photoCount: 1, createdAt },
        };
      },
      cleanup: jest.fn(),
    };

    const result = await executeDirectMessageSend({
      db: {}, senderUid: 'alice', recipientUid: 'bob', messageAdapter: adapter, api,
    });

    expect(result.success).toBe(true);
    expect(result.conversationId).toBe('dm_alice_bob');
    expect(result.messageId).toBeTruthy();
    expect(committedDocs.length).toBeGreaterThan(0);
    expect(adapter.cleanup).not.toHaveBeenCalled();
  });

  test('media upload success then batch failure triggers cleanup', async () => {
    const adapter = {
      async prepare() {
        return { success: true, context: { uploaded: true } };
      },
      buildPayload({ messageId, createdAt, context }) {
        return {
          message: { senderUid: 'alice', type: 'photo', mediaPaths: ['a.jpg'], createdAt },
          lastMessage: { id: messageId, senderUid: 'alice', type: 'photo', photoCount: 1, createdAt },
        };
      },
      cleanup: jest.fn(),
    };

    const api = {
      serverTimestamp: () => 100,
      doc: (_db, ...path) => ({ path: path.join('/') }),
      collection: (parent) => ({ parent, id: 'messages' }),
      writeBatch: () => ({
        set: () => {},
        update: () => {},
        commit: async () => { throw new Error('batch failed'); },
      }),
      getDoc: async () => ({ exists: () => true }),
    };

    const result = await executeDirectMessageSend({
      db: {}, senderUid: 'alice', recipientUid: 'bob', messageAdapter: adapter, api,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('batch failed');
    expect(adapter.cleanup).toHaveBeenCalledWith({ uploaded: true });
  });

  test('adapter upload failure aborts without batch or cleanup', async () => {
    const adapter = {
      async prepare() {
        return { success: false, error: 'upload rejected' };
      },
      buildPayload: jest.fn(),
      cleanup: jest.fn(),
    };

    const api = {
      serverTimestamp: () => 100,
      doc: (_db, ...path) => ({ path: path.join('/') }),
      collection: (parent) => ({ parent, id: 'messages' }),
      getDoc: async () => ({ exists: () => true }),
    };

    const result = await executeDirectMessageSend({
      db: {}, senderUid: 'alice', recipientUid: 'bob', messageAdapter: adapter, api,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('upload rejected');
    expect(adapter.buildPayload).not.toHaveBeenCalled();
    expect(adapter.cleanup).not.toHaveBeenCalled();
  });

  test('adapter-specific payload errors bubble clearly', async () => {
    const adapter = {
      prepare() { return { success: true }; },
      buildPayload() {
        throw new Error('invalid photo ratio');
      },
      cleanup: jest.fn(),
    };

    const api = {
      serverTimestamp: () => 100,
      doc: (_db, ...path) => ({ path: path.join('/') }),
      collection: (parent) => ({ parent, id: 'messages' }),
      getDoc: async () => ({ exists: () => true }),
    };

    const result = await executeDirectMessageSend({
      db: {}, senderUid: 'alice', recipientUid: 'bob', messageAdapter: adapter, api,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('invalid photo ratio');
    expect(adapter.cleanup).not.toHaveBeenCalled();
  });

  test('group send omits sender from notifications', async () => {
    const committedDocs = [];
    const api = {
      serverTimestamp: () => 100,
      doc: (_db, ...path) => ({ path: path.join('/') }),
      collection: (parent) => ({ parent, id: 'messages' }),
      writeBatch: () => ({
        set: (ref, data, opts) => committedDocs.push({ op: 'set', ref: ref.path, data, opts }),
        update: (ref, data) => committedDocs.push({ op: 'update', ref: ref.path, data }),
        commit: async () => {},
      }),
      getDoc: async () => ({ exists: () => true }),
    };

    const adapter = {
      prepare() { return { success: true }; },
      buildPayload({ messageId, createdAt }) {
        return {
          message: { senderUid: 'alice', type: 'text', text: 'hi', createdAt },
          lastMessage: { id: messageId, senderUid: 'alice', type: 'text', text: 'hi', createdAt },
        };
      },
    };

    const result = await executeGroupMessageSend({
      db: {},
      conversation: { id: 'group1', memberUids: ['alice', 'bob'] },
      senderUid: 'alice',
      messageAdapter: adapter,
      api,
    });

    expect(result.success).toBe(true);
    const notifs = committedDocs.filter((d) => d.ref.includes('notifications'));
    expect(notifs.length).toBe(1);
    expect(notifs[0].data.type).toBe('new_group_message');
    expect(notifs[0].ref).toContain('bob');
  });

  test('first DM uses set for conversation and members; existing DM uses update', async () => {
    const committedDocs = [];
    const api = {
      serverTimestamp: () => 100,
      doc: (_db, ...path) => {
        const p = path.join('/');
        return { path: p, id: path[path.length - 1] || 'msg_auto_id' };
      },
      collection: (parent) => ({ parent, id: 'messages' }),
      writeBatch: () => ({
        set: (ref, data, opts) => committedDocs.push({ op: 'set', ref: ref.path, data, opts }),
        update: (ref, data) => committedDocs.push({ op: 'update', ref: ref.path, data }),
        commit: async () => {},
      }),
      getDoc: async () => ({ exists: () => false }),
    };

    const adapter = {
      prepare() { return { success: true }; },
      buildPayload({ messageId, createdAt }) {
        return {
          message: { senderUid: 'alice', type: 'text', text: 'hi', createdAt },
          lastMessage: { id: messageId, senderUid: 'alice', type: 'text', text: 'hi', createdAt },
        };
      },
    };

    await executeDirectMessageSend({
      db: {}, senderUid: 'alice', recipientUid: 'bob', messageAdapter: adapter, api,
    });

    const conversationOps = committedDocs.filter((d) => d.ref.includes('conversations') && !d.ref.includes('messages') && !d.ref.includes('members'));
    expect(conversationOps.length).toBe(1);
    expect(conversationOps[0].op).toBe('set');

    const memberOps = committedDocs.filter((d) => d.ref.includes('members'));
    expect(memberOps.length).toBe(2);
  });
});
