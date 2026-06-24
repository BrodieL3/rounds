const { buildDirectConversationId } = require('./ids');
const { formatInboxMessagePreview, isConversationVisible, toComparableTime } = require('./inbox-display');
const { buildReplyMessagePayload } = require('./reply-service');
const { isMessageVisibleForViewer } = require('./safety-service');
const {
  buildDirectMessageWrites,
  executeDirectMessageSend,
} = require('./message-send-service');

const MAX_TEXT_MESSAGE_LENGTH = 2000;

function defaultApi() {
  return require('firebase/firestore');
}

function nowValue(api) {
  return api && typeof api.serverTimestamp === 'function' ? api.serverTimestamp() : new Date();
}

function normalizeTextMessage(text) {
  const normalized = typeof text === 'string' ? text.trim() : '';
  if (!normalized) throw new Error('Text message cannot be empty');
  if (normalized.length > MAX_TEXT_MESSAGE_LENGTH) {
    throw new Error(`Text message must be ${MAX_TEXT_MESSAGE_LENGTH} characters or fewer`);
  }
  return normalized;
}

function buildDirectMessageRouteParams(viewerUid, otherUid) {
  return {
    pathname: '/conversation/[id]',
    params: {
      id: buildDirectConversationId(viewerUid, otherUid),
      otherUid,
    },
  };
}

function buildDirectTextMessageWrites({
  senderUid,
  recipientUid,
  text,
  messageId,
  createdAt,
  isFirstMessage,
  replyToMessageId,
  replyToPreview,
}) {
  const normalizedText = normalizeTextMessage(text);
  const message = replyToMessageId
    ? buildReplyMessagePayload({
      senderUid,
      text: normalizedText,
      replyToMessageId,
      replyToPreview,
      createdAt,
    })
    : {
      senderUid,
      type: 'text',
      text: normalizedText,
      createdAt,
      deletedForEveryoneAt: null,
    };
  const lastMessage = {
    id: messageId,
    senderUid,
    type: 'text',
    text: normalizedText,
    createdAt,
  };

  return buildDirectMessageWrites({
    senderUid,
    recipientUid,
    message,
    lastMessage,
    messageId,
    createdAt,
    isFirstMessage,
  });
}

function docData(snapshot) {
  return snapshot && typeof snapshot.exists === 'function' && snapshot.exists()
    ? { id: snapshot.id, ...snapshot.data() }
    : null;
}

async function sendDirectTextMessage({ db, senderUid, recipientUid, text, replyToMessageId, replyToPreview }, api = defaultApi()) {
  const adapter = {
    buildPayload({ messageId, createdAt }) {
      const normalizedText = normalizeTextMessage(text);
      const message = replyToMessageId
        ? buildReplyMessagePayload({
          senderUid,
          text: normalizedText,
          replyToMessageId,
          replyToPreview,
          createdAt,
        })
        : {
          senderUid,
          type: 'text',
          text: normalizedText,
          createdAt,
          deletedForEveryoneAt: null,
        };
      const lastMessage = {
        id: messageId,
        senderUid,
        type: 'text',
        text: normalizedText,
        createdAt,
      };
      return { message, lastMessage };
    },
  };

  const result = await executeDirectMessageSend({
    db,
    senderUid,
    recipientUid,
    messageAdapter: adapter,
    api,
  });
  if (!result.success) throw new Error(result.error);
  return { conversationId: result.conversationId, messageId: result.messageId };
}

async function markConversationSeen({ db, uid, conversationId }, api = defaultApi()) {
  await api.setDoc(api.doc(db, 'users', uid, 'conversationStates', conversationId), {
    lastSeenAt: nowValue(api),
  }, { merge: true });
}

async function hideConversationForSelf({ db, uid, conversationId }, api = defaultApi()) {
  await api.setDoc(api.doc(db, 'users', uid, 'conversationStates', conversationId), {
    hiddenAt: nowValue(api),
  }, { merge: true });
}

// Pin/unpin are per-viewer: stored on users/{uid}/conversationStates, never on the shared
// conversations/{id} doc. The inbox view model reads pinnedAt to float the chat to the top.
async function pinConversationForSelf({ db, uid, conversationId }, api = defaultApi()) {
  await api.setDoc(api.doc(db, 'users', uid, 'conversationStates', conversationId), {
    pinnedAt: nowValue(api),
  }, { merge: true });
}

async function unpinConversationForSelf({ db, uid, conversationId }, api = defaultApi()) {
  await api.setDoc(api.doc(db, 'users', uid, 'conversationStates', conversationId), {
    pinnedAt: null,
  }, { merge: true });
}

async function unhideConversationForSelf({ db, uid, conversationId }, api = defaultApi()) {
  await api.setDoc(api.doc(db, 'users', uid, 'conversationStates', conversationId), {
    hiddenAt: null,
  }, { merge: true });
}

function getOtherMemberUid(conversation, uid) {
  return (conversation.memberUids || []).find((memberUid) => memberUid !== uid) || null;
}

function sortByCreatedAt(a, b) {
  return (toComparableTime(a.createdAt) || 0) - (toComparableTime(b.createdAt) || 0);
}

function sortConversationsByLastMessage(a, b) {
  const aLast = toComparableTime(a.lastMessageAt);
  const bLast = toComparableTime(b.lastMessageAt);
  if (aLast != null && bLast != null) return bLast - aLast;
  if (aLast != null) return -1;
  if (bLast != null) return 1;
  return (toComparableTime(b.createdAt) || 0) - (toComparableTime(a.createdAt) || 0);
}

async function buildInboxConversation({ db, uid, conversation, api, includeHidden = false }) {
  const stateSnap = await api.getDoc(api.doc(db, 'users', uid, 'conversationStates', conversation.id));
  const state = docData(stateSnap) || {};
  // The inbox passes includeHidden:true so hidden chats still reach the client for the
  // "Hidden" section; the view model splits visible vs hidden. Share pickers keep the
  // default and exclude hidden conversations.
  if (!includeHidden && !isConversationVisible(conversation, state)) return null;

  const otherUid = conversation.type === 'dm' ? getOtherMemberUid(conversation, uid) : null;
  const otherSnap = otherUid ? await api.getDoc(api.doc(db, 'users', otherUid)) : null;
  const otherUser = docData(otherSnap);
  const dmDisplayName = otherUser?.displayName || otherUser?.username || otherUid || 'Conversation';
  let senderName = conversation.lastMessage?.senderUid === uid ? 'You' : dmDisplayName;

  if (conversation.type === 'group' && conversation.lastMessage?.senderUid && conversation.lastMessage.senderUid !== uid) {
    const senderSnap = await api.getDoc(api.doc(db, 'users', conversation.lastMessage.senderUid));
    const senderUser = docData(senderSnap);
    senderName = senderUser?.displayName || senderUser?.username || conversation.lastMessage.senderUid;
  }

  const displayName = conversation.type === 'group' ? (conversation.name || 'Group chat') : dmDisplayName;

  return {
    ...conversation,
    state,
    otherUid,
    otherUser,
    displayName,
    preview: formatInboxMessagePreview(conversation.lastMessage, {
      conversationType: conversation.type,
      senderName,
    }),
  };
}

function subscribeUserConversations({ db, uid, onChange, onError, includeHidden = false }, api = defaultApi()) {
  const q = api.query(api.collection(db, 'conversations'), api.where('memberUids', 'array-contains', uid));

  return api.onSnapshot(q, async (snapshot) => {
    const conversations = snapshot.docs
      .map((conversationDoc) => ({ id: conversationDoc.id, ...conversationDoc.data() }))
      .filter((conversation) => conversation.type === 'dm' || conversation.type === 'group');
    const inboxRows = (await Promise.all(conversations.map((conversation) =>
      buildInboxConversation({ db, uid, conversation, api, includeHidden }),
    ))).filter(Boolean).sort(sortConversationsByLastMessage);

    onChange(inboxRows);
  }, onError);
}

function subscribeDirectConversations({ db, uid, onChange, onError }, api = defaultApi()) {
  return subscribeUserConversations({
    db,
    uid,
    onChange: (conversations) => onChange(conversations.filter((conversation) => conversation.type === 'dm')),
    onError,
  }, api);
}

async function loadConversation({ db, conversationId }, api = defaultApi()) {
  const snap = await api.getDoc(api.doc(db, 'conversations', conversationId));
  return docData(snap);
}

function subscribeConversationMessages({ db, uid, conversationId, onChange, onError }, api = defaultApi()) {
  let latestMessages = [];
  let latestState = {};
  const emit = () => {
    onChange(latestMessages.filter((message) => isMessageVisibleForViewer(message, latestState)));
  };

  const unsubscribeMessages = api.onSnapshot(api.collection(db, 'conversations', conversationId, 'messages'), (snapshot) => {
    latestMessages = snapshot.docs
      .map((messageDoc) => ({ id: messageDoc.id, ...messageDoc.data() }))
      .sort(sortByCreatedAt);
    emit();
  }, onError);

  if (!uid) return unsubscribeMessages;

  const unsubscribeState = api.onSnapshot(api.doc(db, 'users', uid, 'conversationStates', conversationId), (snapshot) => {
    latestState = docData(snapshot) || {};
    emit();
  }, onError);

  return () => {
    unsubscribeMessages?.();
    unsubscribeState?.();
  };
}

async function loadUserProfile({ db, uid }, api = defaultApi()) {
  const snap = await api.getDoc(api.doc(db, 'users', uid));
  return docData(snap);
}

module.exports = {
  MAX_TEXT_MESSAGE_LENGTH,
  buildDirectMessageRouteParams,
  buildDirectTextMessageWrites,
  hideConversationForSelf,
  unhideConversationForSelf,
  pinConversationForSelf,
  unpinConversationForSelf,
  loadConversation,
  loadUserProfile,
  markConversationSeen,
  normalizeTextMessage,
  sendDirectTextMessage,
  subscribeConversationMessages,
  subscribeDirectConversations,
  subscribeUserConversations,
};
module.exports.__esModule = true;
