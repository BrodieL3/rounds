const COLLECTIONS = Object.freeze({
  friendRequests: 'friendRequests',
  friendships: 'friendships',
  blocks: 'blocks',
  conversations: 'conversations',
  users: 'users',
  ratings: 'ratings',
});

const SUBCOLLECTIONS = Object.freeze({
  conversationMembers: 'members',
  conversationMessages: 'messages',
  conversationStates: 'conversationStates',
  notifications: 'notifications',
  ratingShares: 'shares',
});

const FRIEND_REQUEST_STATUSES = Object.freeze(['pending', 'accepted', 'declined', 'canceled']);

const SOCIAL_STATUSES = Object.freeze([
  'self',
  'blocked_by_me',
  'blocked_me',
  'friends',
  'incoming_pending',
  'outgoing_pending',
  'none',
]);

const CONVERSATION_TYPES = Object.freeze(['dm', 'group']);
const MEMBER_ROLES = Object.freeze(['admin', 'member']);

const MESSAGE_TYPES = Object.freeze([
  'text',
  'photo',
  'voice',
  'poll',
  'location',
  'review_link',
  'venue_link',
]);

const NOTIFICATION_TYPES = Object.freeze([
  'friend_request_received',
  'friend_request_accepted',
  'new_direct_message',
  'new_group_message',
  'added_to_group',
  'tagged_in_review',
  'poll_created',
]);

const GROUP_CHAT_MAX_MEMBERS = 25;

const FIRESTORE_DOC_CONTRACTS = Object.freeze({
  timestampSemantics: 'server timestamp at write time',
  friendRequest: Object.freeze({
    path: 'friendRequests/{fromUid}_{toUid}',
    fields: Object.freeze(['fromUid', 'toUid', 'status', 'createdAt', 'respondedAt']),
  }),
  friendship: Object.freeze({
    path: 'friendships/{minUid}_{maxUid}',
    fields: Object.freeze(['memberUids', 'createdAt', 'createdFromRequestId']),
  }),
  block: Object.freeze({
    path: 'blocks/{blockerUid}_{blockedUid}',
    fields: Object.freeze(['blockerUid', 'blockedUid', 'createdAt']),
  }),
  conversation: Object.freeze({
    path: 'conversations/{conversationId}',
    fields: Object.freeze([
      'type',
      'memberUids',
      'adminUid',
      'name',
      'photoUrl',
      'createdAt',
      'lastMessageAt',
      'archivedAt',
    ]),
  }),
  conversationMember: Object.freeze({
    path: 'conversations/{conversationId}/members/{uid}',
    fields: Object.freeze(['uid', 'role', 'joinedAt', 'leftAt']),
  }),
  message: Object.freeze({
    path: 'conversations/{conversationId}/messages/{messageId}',
    fields: Object.freeze(['senderUid', 'type', 'text', 'createdAt', 'deletedForEveryoneAt']),
  }),
  conversationState: Object.freeze({
    path: 'users/{uid}/conversationStates/{conversationId}',
    fields: Object.freeze(['hiddenAt', 'deletedForSelfAt', 'lastSeenAt']),
  }),
  notification: Object.freeze({
    path: 'users/{uid}/notifications/{notificationId}',
    fields: Object.freeze(['type', 'actorUid', 'conversationId', 'createdAt', 'readAt']),
  }),
  ratingShare: Object.freeze({
    path: 'ratings/{ratingId}/shares/{conversationId}',
    fields: Object.freeze(['conversationId', 'sharedByUid', 'createdAt', 'revokedAt']),
  }),
});

function includesValue(values, value) {
  return values.includes(value);
}

function isFriendRequestStatus(value) {
  return includesValue(FRIEND_REQUEST_STATUSES, value);
}

function isConversationType(value) {
  return includesValue(CONVERSATION_TYPES, value);
}

function isMessageType(value) {
  return includesValue(MESSAGE_TYPES, value);
}

module.exports = {
  COLLECTIONS,
  CONVERSATION_TYPES,
  FIRESTORE_DOC_CONTRACTS,
  FRIEND_REQUEST_STATUSES,
  GROUP_CHAT_MAX_MEMBERS,
  MEMBER_ROLES,
  MESSAGE_TYPES,
  NOTIFICATION_TYPES,
  SOCIAL_STATUSES,
  SUBCOLLECTIONS,
  isConversationType,
  isFriendRequestStatus,
  isMessageType,
};
module.exports.__esModule = true;
