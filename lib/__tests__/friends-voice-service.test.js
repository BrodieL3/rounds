const {
  MAX_VOICE_DURATION_MS,
  VOICE_FORMAT,
  buildVoiceMessagePayload,
  buildDirectVoiceMessageWrites,
  buildGroupVoiceMessageWrites,
  computeVoiceExpiresAt,
  getChatVoicePath,
  isVoicePlayableForViewer,
  sendDirectVoiceMessage,
  sendGroupVoiceMessage,
} = require('../friends/voice-service');

describe('Friends voice message service contracts', () => {
  test('builds voice message payload with storage path and duration', () => {
    expect(buildVoiceMessagePayload({
      senderUid: 'alice',
      storagePath: 'conversations/c1/voice/voice_1.m4a',
      durationMs: 15000,
      createdAt: 10,
    })).toEqual({
      senderUid: 'alice',
      type: 'voice',
      storagePath: 'conversations/c1/voice/voice_1.m4a',
      durationMs: 15000,
      format: 'm4a',
      savedBy: [],
      expiresAt: expect.any(Number),
      createdAt: 10,
      deletedForEveryoneAt: null,
    });
  });

  test('rejects invalid voice payloads', () => {
    expect(() => buildVoiceMessagePayload({})).toThrow('senderUid');
    expect(() => buildVoiceMessagePayload({
      senderUid: 'a', storagePath: 'p.m4a', durationMs: 0,
    })).toThrow('duration');
    expect(() => buildVoiceMessagePayload({
      senderUid: 'a', storagePath: 'p.m4a', durationMs: 70000,
    })).toThrow('duration');
  });

  test('computes 24h expiry from createdAt', () => {
    const createdAt = 1000000;
    const expires = computeVoiceExpiresAt(createdAt);
    expect(expires).toBe(1000000 + 24 * 60 * 60 * 1000);
  });

  test('computes chat voice storage path', () => {
    expect(getChatVoicePath('c1', 12345)).toBe('conversations/c1/voice/voice_12345.m4a');
  });

  test('determines voice playability for viewer', () => {
    const now = Date.now();
    expect(isVoicePlayableForViewer({
      expiresAt: now + 10000,
      savedBy: [],
    }, {}, now)).toBe(true);

    expect(isVoicePlayableForViewer({
      expiresAt: now - 1000,
      savedBy: [],
    }, {}, now)).toBe(false);

    expect(isVoicePlayableForViewer({
      expiresAt: now - 1000,
      savedBy: ['alice'],
    }, {}, now)).toBe(true);
  });

  test('builds first DM voice message writes', () => {
    const writes = buildDirectVoiceMessageWrites({
      senderUid: 'alice',
      recipientUid: 'bob',
      storagePath: 'conversations/dm_alice_bob/voice/voice_1.m4a',
      durationMs: 15000,
      messageId: 'm1',
      createdAt: 10,
      isFirstMessage: true,
    });

    expect(writes.conversationId).toBe('dm_alice_bob');
    expect(writes.conversation.type).toBe('dm');
    expect(writes.message.type).toBe('voice');
    expect(writes.message.durationMs).toBe(15000);
    expect(writes.message.format).toBe('m4a');
    expect(writes.members).toBeTruthy();
    expect(writes.recipientNotification.type).toBe('new_direct_message');
  });

  test('builds group voice message writes with notification fanout', () => {
    const writes = buildGroupVoiceMessageWrites({
      conversationId: 'group1',
      memberUids: ['alice', 'bob', 'cara'],
      senderUid: 'alice',
      storagePath: 'conversations/group1/voice/voice_1.m4a',
      durationMs: 15000,
      messageId: 'm1',
      createdAt: 10,
    });

    expect(writes.conversationUpdate.lastMessage.type).toBe('voice');
    expect(writes.message.durationMs).toBe(15000);
    expect(Object.keys(writes.recipientNotifications)).toEqual(['bob', 'cara']);
  });
});
