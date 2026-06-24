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

const WEEKDAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// iMessage-style inbox timestamp: today -> clock ("9:41 PM"), yesterday -> "Yesterday",
// within the last week -> weekday abbreviation ("Mon"), older -> numeric date ("6/14/26").
function formatInboxTimestamp(value, now = Date.now()) {
  const ms = toComparableTime(value);
  if (ms == null) return '';

  const date = new Date(ms);
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const daysDiff = Math.round((startOfDay(new Date(now)) - startOfDay(date)) / dayMs);

  if (daysDiff <= 0) {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const meridiem = hours >= 12 ? 'PM' : 'AM';
    hours %= 12;
    if (hours === 0) hours = 12;
    return `${hours}:${String(minutes).padStart(2, '0')} ${meridiem}`;
  }
  if (daysDiff === 1) return 'Yesterday';
  if (daysDiff < 7) return WEEKDAY_ABBR[date.getDay()];

  const year = String(date.getFullYear()).slice(-2);
  return `${date.getMonth() + 1}/${date.getDate()}/${year}`;
}

// A conversation is unread when the latest message arrived after the viewer last saw the
// thread AND the viewer is not the one who sent it (mirrors the iMessage blue dot).
function isConversationUnread(conversation = {}, state = {}, viewerUid = null) {
  const lastMessageAt = toComparableTime(conversation.lastMessageAt);
  if (lastMessageAt == null) return false;
  const senderUid = conversation.lastMessage && conversation.lastMessage.senderUid;
  if (viewerUid && senderUid === viewerUid) return false;
  const lastSeenAt = toComparableTime(state.lastSeenAt);
  if (lastSeenAt == null) return true;
  return lastMessageAt > lastSeenAt;
}

function sortConversationsByLastMessage(a, b) {
  const aLast = toComparableTime(a.lastMessageAt);
  const bLast = toComparableTime(b.lastMessageAt);
  if (aLast != null && bLast != null) return bLast - aLast;
  if (aLast != null) return -1;
  if (bLast != null) return 1;
  return (toComparableTime(b.createdAt) || 0) - (toComparableTime(a.createdAt) || 0);
}

function resolveRowState(conversation, conversationStates) {
  return conversation.state || conversationStates[conversation.id] || {};
}

function decorateInboxRow(conversation, state, viewerUid, now) {
  const pinnedAt = toComparableTime(state.pinnedAt);
  return {
    ...conversation,
    pinned: pinnedAt != null,
    pinnedAt,
    unread: isConversationUnread(conversation, state, viewerUid),
    timestamp: formatInboxTimestamp(conversation.lastMessageAt, now),
  };
}

function buildFriendsInboxViewModel(conversations = [], conversationStates = {}, viewerUid = null, now = Date.now()) {
  const sourceConversations = Array.isArray(conversations) ? conversations : [];

  const visible = [];
  const hiddenRows = [];
  sourceConversations.forEach((conversation) => {
    const state = resolveRowState(conversation, conversationStates);
    const row = decorateInboxRow(conversation, state, viewerUid, now);
    if (isConversationVisible(conversation, state)) {
      visible.push(row);
    } else {
      hiddenRows.push(row);
    }
  });

  const pinned = visible
    .filter((conversation) => conversation.pinned)
    .sort((a, b) => (b.pinnedAt || 0) - (a.pinnedAt || 0));
  const unpinned = visible
    .filter((conversation) => !conversation.pinned)
    .sort(sortConversationsByLastMessage);
  const hidden = hiddenRows.sort(sortConversationsByLastMessage);

  return {
    screenTitle: FRIENDS_EMPTY_INBOX.screenTitle,
    screenSubtitle: FRIENDS_EMPTY_INBOX.screenSubtitle,
    inboxTitle: FRIENDS_EMPTY_INBOX.inboxTitle,
    pinned,
    conversations: unpinned,
    hidden,
    isEmpty: pinned.length === 0 && unpinned.length === 0,
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
  formatInboxTimestamp,
  isConversationUnread,
  isConversationVisible,
  toComparableTime,
};
module.exports.__esModule = true;
