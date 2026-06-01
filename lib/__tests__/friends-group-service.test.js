const {
  buildGroupCreateRequest,
  buildGroupTextMessageWrites,
  normalizeGroupName,
} = require('../friends/group-service');

describe('Friends group service contracts', () => {
  test('normalizes group names and rejects empty or oversized names', () => {
    expect(normalizeGroupName('  Tonight crew  ')).toBe('Tonight crew');
    expect(() => normalizeGroupName('   ')).toThrow('Group name');
    expect(() => normalizeGroupName('x'.repeat(61))).toThrow('60');
  });

  test('builds create-group request with a valid friend selection', () => {
    expect(buildGroupCreateRequest({
      name: '  Birthday night  ',
      selectedMemberUids: ['cara', 'bob'],
    })).toEqual({
      name: 'Birthday night',
      selectedMemberUids: ['bob', 'cara'],
    });

    expect(() => buildGroupCreateRequest({ name: 'Too small', selectedMemberUids: ['bob'] })).toThrow('2');
    expect(() => buildGroupCreateRequest({
      name: 'Too big',
      selectedMemberUids: Array.from({ length: 25 }, (_, index) => `user${index}`),
    })).toThrow('24');
  });

  test('builds group text writes for active members and notification fanout', () => {
    expect(buildGroupTextMessageWrites({
      conversationId: 'group1',
      memberUids: ['alice', 'bob', 'cara'],
      senderUid: 'alice',
      text: '  where first? ',
      messageId: 'm1',
      createdAt: 10,
    })).toEqual({
      conversationUpdate: {
        lastMessageAt: 10,
        lastMessage: {
          id: 'm1',
          senderUid: 'alice',
          type: 'text',
          text: 'where first?',
          createdAt: 10,
        },
      },
      message: {
        senderUid: 'alice',
        type: 'text',
        text: 'where first?',
        createdAt: 10,
        deletedForEveryoneAt: null,
      },
      senderState: { hiddenAt: null, lastSeenAt: 10 },
      recipientNotifications: {
        bob: { type: 'new_group_message', actorUid: 'alice', conversationId: 'group1', createdAt: 10 },
        cara: { type: 'new_group_message', actorUid: 'alice', conversationId: 'group1', createdAt: 10 },
      },
    });
  });
});
