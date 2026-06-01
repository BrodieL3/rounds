const {
  COLLECTIONS,
  CONVERSATION_TYPES,
  FIRESTORE_DOC_CONTRACTS,
  FRIEND_REQUEST_STATUSES,
  GROUP_CHAT_MAX_MEMBERS,
  MEMBER_ROLES,
  MESSAGE_TYPES,
  NOTIFICATION_TYPES,
  SOCIAL_STATUSES,
  isConversationType,
  isFriendRequestStatus,
  isMessageType,
} = require('../friends/contracts');

describe('Friends Firestore contracts', () => {
  test('exposes canonical collection paths for Friends planning state', () => {
    expect(COLLECTIONS).toEqual({
      friendRequests: 'friendRequests',
      friendships: 'friendships',
      blocks: 'blocks',
      conversations: 'conversations',
      users: 'users',
      ratings: 'ratings',
    });
  });

  test('standardizes social state and document enum values', () => {
    expect(FRIEND_REQUEST_STATUSES).toEqual(['pending', 'accepted', 'declined', 'canceled']);
    expect(SOCIAL_STATUSES).toEqual([
      'self',
      'blocked_by_me',
      'blocked_me',
      'friends',
      'incoming_pending',
      'outgoing_pending',
      'none',
    ]);
    expect(CONVERSATION_TYPES).toEqual(['dm', 'group']);
    expect(MEMBER_ROLES).toEqual(['admin', 'member']);
    expect(MESSAGE_TYPES).toEqual([
      'text',
      'photo',
      'voice',
      'poll',
      'location',
      'review_link',
      'venue_link',
    ]);
    expect(NOTIFICATION_TYPES).toEqual([
      'friend_request_received',
      'friend_request_accepted',
      'new_direct_message',
      'new_group_message',
      'added_to_group',
      'tagged_in_review',
      'poll_created',
    ]);
    expect(GROUP_CHAT_MAX_MEMBERS).toBe(25);
  });

  test('documents canonical Firestore document fields without importing Firebase types', () => {
    expect(FIRESTORE_DOC_CONTRACTS.friendRequest.fields).toEqual([
      'fromUid',
      'toUid',
      'status',
      'createdAt',
      'respondedAt',
    ]);
    expect(FIRESTORE_DOC_CONTRACTS.conversation.fields).toEqual([
      'type',
      'memberUids',
      'adminUid',
      'name',
      'photoUrl',
      'createdAt',
      'lastMessageAt',
      'archivedAt',
    ]);
    expect(FIRESTORE_DOC_CONTRACTS.ratingShare.path).toBe('ratings/{ratingId}/shares/{conversationId}');
    expect(FIRESTORE_DOC_CONTRACTS.timestampSemantics).toBe('server timestamp at write time');
  });

  test('provides lightweight enum predicates without schema dependencies', () => {
    expect(isFriendRequestStatus('pending')).toBe(true);
    expect(isFriendRequestStatus('friends')).toBe(false);
    expect(isConversationType('group')).toBe(true);
    expect(isConversationType('channel')).toBe(false);
    expect(isMessageType('venue_link')).toBe(true);
    expect(isMessageType('video')).toBe(false);
  });
});
