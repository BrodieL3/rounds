const {
  buildGroupCreateRequest,
  buildGroupInfoViewModel,
  buildGroupInviteRequest,
  buildGroupTextMessageWrites,
  getAddableGroupFriends,
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

  test('builds invite request and enforces remaining group slots', () => {
    expect(buildGroupInviteRequest({
      conversationId: 'group1',
      selectedMemberUids: ['erin', 'dana', 'dana'],
      activeMemberUids: ['alice', 'bob'],
    })).toEqual({ conversationId: 'group1', selectedMemberUids: ['dana', 'erin'] });

    expect(() => buildGroupInviteRequest({ conversationId: 'group1', selectedMemberUids: [], activeMemberUids: ['alice'] })).toThrow('one');
    expect(() => buildGroupInviteRequest({ conversationId: 'group1', selectedMemberUids: ['bob'], activeMemberUids: ['alice', 'bob'] })).toThrow('already');
    expect(() => buildGroupInviteRequest({
      conversationId: 'group1',
      selectedMemberUids: ['overflow'],
      activeMemberUids: Array.from({ length: 25 }, (_, index) => `user${index}`),
    })).toThrow('cap');
  });

  test('builds group info actions for admin and non-admin viewers', () => {
    const members = [
      { uid: 'alice', displayName: 'Alice', role: 'admin' },
      { uid: 'bob', username: 'bobby', role: 'member' },
      { uid: 'cara', role: 'member' },
    ];

    expect(buildGroupInfoViewModel({ viewerUid: 'alice', adminUid: 'alice', members }).actions).toEqual({
      canAddMembers: true,
      canLeave: true,
      removableMemberUids: ['bob', 'cara'],
    });
    expect(buildGroupInfoViewModel({ viewerUid: 'bob', adminUid: 'alice', members })).toMatchObject({
      members: [
        { uid: 'alice', label: 'Alice', isAdmin: true, canRemove: false },
        { uid: 'bob', label: 'bobby', isAdmin: false, canRemove: false },
        { uid: 'cara', label: 'cara', isAdmin: false, canRemove: false },
      ],
      actions: { canAddMembers: false, canLeave: true, removableMemberUids: [] },
    });
  });

  test('filters add-member picker to Friends who are not active members or the viewer', () => {
    expect(getAddableGroupFriends({
      viewerUid: 'alice',
      activeMemberUids: ['alice', 'bob'],
      friends: [
        { uid: 'alice', displayName: 'Alice' },
        { uid: 'bob', displayName: 'Bob' },
        { uid: 'cara', displayName: 'Cara' },
      ],
      search: 'car',
    })).toEqual([{ uid: 'cara', displayName: 'Cara' }]);
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

  test('stores group reply quote metadata on message only', () => {
    const writes = buildGroupTextMessageWrites({
      conversationId: 'group1',
      memberUids: ['alice', 'bob'],
      senderUid: 'alice',
      text: 'agree',
      messageId: 'm2',
      createdAt: 20,
      replyToMessageId: 'm1',
      replyToPreview: { senderUid: 'bob', type: 'poll', snippet: 'Poll: Where?' },
    });

    expect(writes.message).toMatchObject({
      replyToMessageId: 'm1',
      replyToPreview: { senderUid: 'bob', type: 'poll', snippet: 'Poll: Where?' },
    });
    expect(writes.conversationUpdate.lastMessage).not.toHaveProperty('replyToMessageId');
  });
});
