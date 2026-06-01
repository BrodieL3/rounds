const {
  canInviteToGroup,
  canSendDirectMessage,
  canSendFriendRequest,
  canTagReviewCompanion,
  canCommentOnUserContent,
} = require('../friends/permissions');

const friendship = { memberUids: ['alice', 'bob'] };

describe('Friends permission decisions', () => {
  test('denies direct messages and group invites without Friendship', () => {
    expect(canSendDirectMessage({ viewerUid: 'alice', otherUid: 'bob' })).toBe(false);
    expect(canInviteToGroup({ viewerUid: 'alice', inviteeUid: 'bob' })).toBe(false);
  });

  test('allows direct messages and group invites between Friends', () => {
    expect(canSendDirectMessage({ viewerUid: 'alice', otherUid: 'bob', friendships: [friendship] })).toBe(true);
    expect(canInviteToGroup({ viewerUid: 'alice', inviteeUid: 'bob', friendships: [friendship] })).toBe(true);
  });

  test('block denies friend request, message, invite, tag, and comment interactions', () => {
    const blocks = [{ blockerUid: 'alice', blockedUid: 'bob' }];

    expect(canSendFriendRequest({ viewerUid: 'alice', otherUid: 'bob', blocks })).toBe(false);
    expect(canSendDirectMessage({ viewerUid: 'alice', otherUid: 'bob', friendships: [friendship], blocks })).toBe(false);
    expect(canInviteToGroup({ viewerUid: 'alice', inviteeUid: 'bob', friendships: [friendship], blocks })).toBe(false);
    expect(canTagReviewCompanion({ authorUid: 'alice', taggedUid: 'bob', blocks })).toBe(false);
    expect(canCommentOnUserContent({ viewerUid: 'alice', ownerUid: 'bob', blocks })).toBe(false);
  });

  test('prevents duplicate or inverse pending friend requests', () => {
    expect(
      canSendFriendRequest({
        viewerUid: 'alice',
        otherUid: 'bob',
        friendRequests: [{ fromUid: 'bob', toUid: 'alice', status: 'pending' }],
      }),
    ).toBe(false);

    expect(
      canSendFriendRequest({
        viewerUid: 'alice',
        otherUid: 'bob',
        friendRequests: [{ fromUid: 'alice', toUid: 'bob', status: 'pending' }],
      }),
    ).toBe(false);
  });

  test('allows friend request only when no relationship or block exists', () => {
    expect(canSendFriendRequest({ viewerUid: 'alice', otherUid: 'bob' })).toBe(true);
    expect(canSendFriendRequest({ viewerUid: 'alice', otherUid: 'bob', friendships: [friendship] })).toBe(false);
  });
});
