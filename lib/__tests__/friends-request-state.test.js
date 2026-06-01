const { deriveFriendshipStatus } = require('../friends/request-state');

describe('Friends request and Friendship status derivation', () => {
  test('returns self when viewing own social state', () => {
    expect(deriveFriendshipStatus({ viewerUid: 'alice', otherUid: 'alice' })).toBe('self');
  });

  test('block state wins over requests and Friendship', () => {
    const friendship = { memberUids: ['alice', 'bob'] };
    const friendRequests = [{ fromUid: 'alice', toUid: 'bob', status: 'pending' }];

    expect(
      deriveFriendshipStatus({
        viewerUid: 'alice',
        otherUid: 'bob',
        friendship,
        friendRequests,
        blocks: [{ blockerUid: 'alice', blockedUid: 'bob' }],
      }),
    ).toBe('blocked_by_me');

    expect(
      deriveFriendshipStatus({
        viewerUid: 'alice',
        otherUid: 'bob',
        friendship,
        friendRequests,
        blocks: [{ blockerUid: 'bob', blockedUid: 'alice' }],
      }),
    ).toBe('blocked_me');
  });

  test('returns friends for active Friendship', () => {
    expect(
      deriveFriendshipStatus({
        viewerUid: 'alice',
        otherUid: 'bob',
        friendship: { memberUids: ['bob', 'alice'] },
      }),
    ).toBe('friends');
  });

  test('returns incoming pending for inverse request instead of allowing duplicate request', () => {
    expect(
      deriveFriendshipStatus({
        viewerUid: 'alice',
        otherUid: 'bob',
        friendRequests: [{ fromUid: 'bob', toUid: 'alice', status: 'pending' }],
      }),
    ).toBe('incoming_pending');
  });

  test('returns outgoing pending for viewer-created request', () => {
    expect(
      deriveFriendshipStatus({
        viewerUid: 'alice',
        otherUid: 'bob',
        friendRequests: [{ fromUid: 'alice', toUid: 'bob', status: 'pending' }],
      }),
    ).toBe('outgoing_pending');
  });

  test('ignores non-pending request docs', () => {
    expect(
      deriveFriendshipStatus({
        viewerUid: 'alice',
        otherUid: 'bob',
        friendRequests: [{ fromUid: 'bob', toUid: 'alice', status: 'declined' }],
      }),
    ).toBe('none');
  });
});
