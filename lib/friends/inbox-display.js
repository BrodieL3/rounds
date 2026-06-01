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

function previewBody(message = {}) {
  if (message.deletedForEveryoneAt) return 'Message deleted.';

  switch (message.type) {
    case 'text':
      return message.text || '';
    case 'photo':
      return 'Photo';
    case 'voice':
      return 'Voice note';
    case 'poll':
      return `Poll: ${message.question || 'Poll'}`;
    case 'location':
      return 'Location';
    case 'review_link':
      return `Review: ${message.venueName || 'Review'}`;
    case 'venue_link':
      return `Venue: ${message.venueName || 'Venue'}`;
    default:
      return 'Message';
  }
}

function formatInboxMessagePreview(message = {}, options = {}) {
  const body = previewBody(message);

  if (options.conversationType === 'group' && options.senderName) {
    return `${options.senderName}: ${body}`;
  }

  return body;
}

function buildFriendsInboxViewModel(conversations = [], conversationStates = {}) {
  const sourceConversations = Array.isArray(conversations) ? conversations : [];
  const visibleConversations = sourceConversations.filter((conversation) =>
    isConversationVisible(conversation, conversationStates[conversation.id] || {}),
  );

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
