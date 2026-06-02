const {
  buildBlockUserWrites,
  buildHideMessageForSelfUpdate,
  buildNotificationPushPreview,
  buildReportPayload,
  isMessageVisibleForViewer,
} = require('../friends/safety-service');

describe('Friends safety service contracts', () => {
  test('builds block writes that remove social edges and hide the blocker DM', () => {
    expect(buildBlockUserWrites({ blockerUid: 'alice', blockedUid: 'bob', createdAt: 10 })).toEqual({
      blockId: 'alice_bob',
      block: { blockerUid: 'alice', blockedUid: 'bob', createdAt: 10 },
      friendshipId: 'alice_bob',
      pendingRequestIds: ['alice_bob', 'bob_alice'],
      dmConversationId: 'dm_alice_bob',
      blockerConversationState: { hiddenAt: 10 },
      followRemovals: {
        alice: { followersRemove: 'bob', followingRemove: 'bob' },
        bob: { followersRemove: 'alice', followingRemove: 'alice' },
      },
    });
  });

  test('hides individual messages through private viewer state only', () => {
    expect(buildHideMessageForSelfUpdate({ currentHiddenMessageIds: ['m1'], messageId: 'm2' })).toEqual({
      hiddenMessageIds: ['m1', 'm2'],
    });
    expect(buildHideMessageForSelfUpdate({ currentHiddenMessageIds: ['m1'], messageId: 'm1' })).toEqual({
      hiddenMessageIds: ['m1'],
    });
    expect(isMessageVisibleForViewer({ id: 'm2' }, { hiddenMessageIds: ['m1'] })).toBe(true);
    expect(isMessageVisibleForViewer({ id: 'm2' }, { hiddenMessageIds: ['m2'] })).toBe(false);
  });

  test('builds report payloads without leaking message body into notification-like previews', () => {
    expect(buildReportPayload({
      reporterUid: 'alice',
      targetType: 'message',
      targetId: 'm1',
      conversationId: 'dm_alice_bob',
      reportedUid: 'bob',
      reason: '  Harassing message  ',
      createdAt: 20,
    })).toEqual({
      reporterUid: 'alice',
      targetType: 'message',
      targetId: 'm1',
      conversationId: 'dm_alice_bob',
      reportedUid: 'bob',
      reason: 'Harassing message',
      createdAt: 20,
      status: 'open',
    });

    expect(buildNotificationPushPreview({
      type: 'new_group_message',
      actorDisplayName: 'Bob',
      conversationName: 'Birthday',
      text: 'meet at 9?',
    })).toEqual({ title: 'Birthday', body: 'New message' });
  });
});
