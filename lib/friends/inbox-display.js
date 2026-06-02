const FRIENDS_EMPTY_INBOX = {
  screenTitle: 'Friends',
  screenSubtitle: 'Plan nights out with people you actually go out with.',
  inboxTitle: 'Inbox',
  createChatLabel: 'Create chat',
  friendRequestsLabel: 'Friend requests',
  friendRequestsEmpty: 'No pending requests',
  title: 'No conversations yet',
  body: 'Add friends, then start a DM or group chat to plan your next night out.',
};

function toComparableTime(value) {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  return null;
}

function isConversationVisible(conversation = {}, state = {}) {
  const hiddenAt = toComparableTime(state.hiddenAt || state.deletedForSelfAt);
  if (hiddenAt == null) return true;

  const lastMessageAt = toComparableTime(conversation.lastMessageAt);
  if (lastMessageAt == null) return false;

  return lastMessageAt > hiddenAt;
}

function previewBody(message = {}, options = {}) {
  if (!message && options.conversationType === 'group') return 'No messages yet';
  const source = message || {};
  if (source.deletedForEveryoneAt) return 'Message deleted.';

  switch (source.type) {
    case 'text':
      return source.text || '';
    case 'photo': {
      const count = typeof source.photoCount === 'number' ? source.photoCount : 1;
      return count === 1 ? 'Photo' : `${count} photos`;
    }
    case 'voice':
      return 'Voice note';
    case 'poll':
      return `Poll: ${source.question || 'Poll'}`;
    case 'location':
      return source.label || 'Location';
    case 'review_link':
      return `Review: ${source.venueName || 'Review'}`;
    case 'venue_link':
      return `Venue: ${source.venueName || 'Venue'}`;
    default:
      return 'Message';
  }
}

function formatInboxMessagePreview(message = {}, options = {}) {
  const body = previewBody(message, options);

  if (options.conversationType === 'group' && options.senderName) {
    return `${options.senderName}: ${body}`;
  }

  return body;
}

function buildFriendsInboxViewModel(conversations = [], conversationStates = {}) {
  const sourceConversations = Array.isArray(conversations) ? conversations : [];
  const visibleConversations = sourceConversations
    .filter((conversation) => isConversationVisible(conversation, conversationStates[conversation.id] || {}))
    .sort((a, b) => {
      const aLast = toComparableTime(a.lastMessageAt);
      const bLast = toComparableTime(b.lastMessageAt);
      if (aLast != null && bLast != null) return bLast - aLast;
      if (aLast != null) return -1;
      if (bLast != null) return 1;
      return (toComparableTime(b.createdAt) || 0) - (toComparableTime(a.createdAt) || 0);
    });

  return {
    screenTitle: FRIENDS_EMPTY_INBOX.screenTitle,
    screenSubtitle: FRIENDS_EMPTY_INBOX.screenSubtitle,
    inboxTitle: FRIENDS_EMPTY_INBOX.inboxTitle,
    conversations: visibleConversations,
    isEmpty: visibleConversations.length === 0,
    emptyState: {
      title: FRIENDS_EMPTY_INBOX.title,
      body: FRIENDS_EMPTY_INBOX.body,
    },
    actions: {
      createChatLabel: FRIENDS_EMPTY_INBOX.createChatLabel,
      friendRequestsLabel: FRIENDS_EMPTY_INBOX.friendRequestsLabel,
    },
  };
}

module.exports = {
  FRIENDS_EMPTY_INBOX,
  buildFriendsInboxViewModel,
  formatInboxMessagePreview,
  isConversationVisible,
  toComparableTime,
};
module.exports.__esModule = true;
