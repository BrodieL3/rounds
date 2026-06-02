const {
  buildAcceptedFriendshipWrites,
  buildFriendRequestNotification,
  buildPendingFriendRequest,
  getFriendshipCta,
  loadFriendshipStatus,
} = require('../friends/friendship-service');

describe('Friends Friendship service contracts', () => {
  test('builds pending Friend Request payload and received notification', () => {
    expect(buildPendingFriendRequest({ fromUid: 'alice', toUid: 'bob', createdAt: 1 })).toEqual({
      id: 'alice_bob',
      data: {
        fromUid: 'alice',
        toUid: 'bob',
        status: 'pending',
        createdAt: 1,
      },
    });

    expect(
      buildFriendRequestNotification({ type: 'friend_request_received', actorUid: 'alice', createdAt: 1 }),
    ).toEqual({
      type: 'friend_request_received',
      actorUid: 'alice',
      createdAt: 1,
    });
  });

  test('builds accepted Friendship writes including mutual follow targets', () => {
    expect(buildAcceptedFriendshipWrites({ fromUid: 'alice', toUid: 'bob', respondedAt: 2 })).toEqual({
      requestId: 'alice_bob',
      friendshipId: 'alice_bob',
      requestUpdate: { status: 'accepted', respondedAt: 2 },
      friendship: {
        memberUids: ['alice', 'bob'],
        createdAt: 2,
        createdFromRequestId: 'alice_bob',
      },
      followUpdates: {
        alice: { followersAdd: 'bob', followingAdd: 'bob' },
        bob: { followersAdd: 'alice', followingAdd: 'alice' },
      },
      notification: {
        type: 'friend_request_accepted',
        actorUid: 'bob',
        createdAt: 2,
      },
    });
  });

  test('loads block-aware Friendship status for Profile CTAs', async () => {
    const docs = {
      'blocks/bob_alice': { blockerUid: 'bob', blockedUid: 'alice', createdAt: 1 },
      'friendships/alice_bob': { memberUids: ['alice', 'bob'], createdAt: 1 },
    };
    const api = {
      doc: (_db, ...segments) => ({ path: segments.join('/'), id: segments[segments.length - 1] }),
      getDoc: async (ref) => ({
        id: ref.id,
        exists: () => docs[ref.path] !== undefined,
        data: () => docs[ref.path],
      }),
    };

    await expect(loadFriendshipStatus({ db: {}, viewerUid: 'alice', otherUid: 'bob' }, api)).resolves.toBe('blocked_me');
  });

  test('maps viewer-relative social status to Profile CTA labels', () => {
    expect(getFriendshipCta('none')).toEqual({ label: 'Add Friend', action: 'send_request', disabled: false });
    expect(getFriendshipCta('outgoing_pending')).toEqual({ label: 'Requested', action: 'cancel_request', disabled: false });
    expect(getFriendshipCta('incoming_pending')).toEqual({ label: 'Respond', action: 'respond_request', disabled: false });
    expect(getFriendshipCta('friends')).toEqual({ label: 'Friends', action: 'none', disabled: true, showMessage: true });
    expect(getFriendshipCta('blocked_me')).toEqual({ label: 'Unavailable', action: 'none', disabled: true });
  });
});
