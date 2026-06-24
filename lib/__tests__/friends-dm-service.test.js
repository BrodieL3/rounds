const {
  buildDirectTextMessageWrites,
  buildDirectMessageRouteParams,
  normalizeTextMessage,
  pinConversationForSelf,
  unpinConversationForSelf,
  unhideConversationForSelf,
} = require('../friends/dm-service');

describe('Friends direct message service contracts', () => {
  test('normalizes text messages and rejects empty or oversized text', () => {
    expect(normalizeTextMessage('  meet at 9?  ')).toBe('meet at 9?');
    expect(() => normalizeTextMessage('   ')).toThrow('empty');
    expect(() => normalizeTextMessage('x'.repeat(2001))).toThrow('2000');
  });

  test('builds route params without creating a conversation doc', () => {
    expect(buildDirectMessageRouteParams('bob', 'alice')).toEqual({
      pathname: '/conversation/[id]',
      params: { id: 'dm_alice_bob', otherUid: 'alice' },
    });
  });

  test('builds first-message DM writes for canonical conversation, members, states, and notification', () => {
    expect(
      buildDirectTextMessageWrites({
        senderUid: 'bob',
        recipientUid: 'alice',
        text: '  meet at 9? ',
        messageId: 'm1',
        createdAt: 10,
        isFirstMessage: true,
      }),
    ).toEqual({
      conversationId: 'dm_alice_bob',
      conversation: {
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
      },
      members: {
        alice: { uid: 'alice', role: 'member', joinedAt: 10, leftAt: null },
        bob: { uid: 'bob', role: 'member', joinedAt: 10, leftAt: null },
      },
      message: {
        senderUid: 'bob',
        type: 'text',
        text: 'meet at 9?',
        createdAt: 10,
        deletedForEveryoneAt: null,
      },
      senderState: { hiddenAt: null, lastSeenAt: 10 },
      recipientState: { hiddenAt: null },
      recipientNotification: {
        type: 'new_direct_message',
        actorUid: 'bob',
        conversationId: 'dm_alice_bob',
        createdAt: 10,
      },
    });
  });

  test('builds subsequent-message writes without recreating conversation members', () => {
    const writes = buildDirectTextMessageWrites({
      senderUid: 'alice',
      recipientUid: 'bob',
      text: 'omw',
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
    expect(writes.members).toBe(null);
    expect(writes.senderState).toEqual({ hiddenAt: null, lastSeenAt: 20 });
    expect(writes.recipientState).toBe(null);
  });

  test('stores reply quote metadata on message but not lastMessage', () => {
    const writes = buildDirectTextMessageWrites({
      senderUid: 'alice',
      recipientUid: 'bob',
      text: 'agree',
      messageId: 'm2',
      createdAt: 20,
      isFirstMessage: false,
      replyToMessageId: 'm1',
      replyToPreview: { senderUid: 'bob', type: 'text', snippet: 'where first?' },
    });

    expect(writes.message).toMatchObject({
      replyToMessageId: 'm1',
      replyToPreview: { senderUid: 'bob', type: 'text', snippet: 'where first?' },
    });
    expect(writes.conversation.lastMessage).not.toHaveProperty('replyToMessageId');
  });
});

describe('Friends conversation pin state', () => {
  function fakeApi() {
    const calls = [];
    return {
      calls,
      setDoc: (ref, data, opts) => { calls.push({ ref, data, opts }); return Promise.resolve(); },
      doc: (...path) => path,
      serverTimestamp: () => 'SERVER_TS',
    };
  }

  test('pinConversationForSelf writes pinnedAt to the per-user conversationStates doc', async () => {
    const api = fakeApi();
    await pinConversationForSelf({ db: 'DB', uid: 'me', conversationId: 'c1' }, api);

    expect(api.calls).toHaveLength(1);
    expect(api.calls[0].ref).toEqual(['DB', 'users', 'me', 'conversationStates', 'c1']);
    expect(api.calls[0].data).toEqual({ pinnedAt: 'SERVER_TS' });
    expect(api.calls[0].opts).toEqual({ merge: true });
  });

  test('unpinConversationForSelf clears pinnedAt on the per-user doc', async () => {
    const api = fakeApi();
    await unpinConversationForSelf({ db: 'DB', uid: 'me', conversationId: 'c1' }, api);

    expect(api.calls[0].ref).toEqual(['DB', 'users', 'me', 'conversationStates', 'c1']);
    expect(api.calls[0].data).toEqual({ pinnedAt: null });
    expect(api.calls[0].opts).toEqual({ merge: true });
  });

  test('unhideConversationForSelf clears hiddenAt on the per-user doc', async () => {
    const api = fakeApi();
    await unhideConversationForSelf({ db: 'DB', uid: 'me', conversationId: 'c1' }, api);

    expect(api.calls[0].ref).toEqual(['DB', 'users', 'me', 'conversationStates', 'c1']);
    expect(api.calls[0].data).toEqual({ hiddenAt: null });
    expect(api.calls[0].opts).toEqual({ merge: true });
  });
});
