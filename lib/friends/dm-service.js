const { buildDirectConversationId, getSortedPairUids } = require('./ids');
const { formatInboxMessagePreview, isConversationVisible, toComparableTime } = require('./inbox-display');
const { buildReplyMessagePayload } = require('./reply-service');
const { isMessageVisibleForViewer } = require('./safety-service');

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
  const conversationId = buildDirectConversationId(senderUid, recipientUid);
  const memberUids = getSortedPairUids(senderUid, recipientUid);
  const lastMessage = {
    id: messageId,
    senderUid,
    type: 'text',
    text: normalizedText,
    createdAt,
  };
  const conversation = isFirstMessage
    ? {
      type: 'dm',
      memberUids,
      createdAt,
      createdByUid: senderUid,
      lastMessageAt: createdAt,
      lastMessage,
    }
    : {
      lastMessageAt: createdAt,
      lastMessage,
    };

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

  return {
    conversationId,
    conversation,
    members: isFirstMessage
      ? {
        [memberUids[0]]: { uid: memberUids[0], role: 'member', joinedAt: createdAt, leftAt: null },
        [memberUids[1]]: { uid: memberUids[1], role: 'member', joinedAt: createdAt, leftAt: null },
      }
      : null,
    message,
    senderState: { hiddenAt: null, lastSeenAt: createdAt },
    recipientState: isFirstMessage ? { hiddenAt: null } : null,
    recipientNotification: {
      type: 'new_direct_message',
      actorUid: senderUid,
      conversationId,
      createdAt,
    },
  };
}

function docData(snapshot) {
  return snapshot && typeof snapshot.exists === 'function' && snapshot.exists()
    ? { id: snapshot.id, ...snapshot.data() }
    : null;
}

async function sendDirectTextMessage({ db, senderUid, recipientUid, text, replyToMessageId, replyToPreview }, api = defaultApi()) {
  const conversationId = buildDirectConversationId(senderUid, recipientUid);
  const conversationRef = api.doc(db, 'conversations', conversationId);
  const messageRef = api.doc(api.collection(conversationRef, 'messages'));
  const createdAt = nowValue(api);
  const conversationSnap = await api.getDoc(conversationRef);
  const isFirstMessage = !conversationSnap.exists();
  const writes = buildDirectTextMessageWrites({
    senderUid,
    recipientUid,
    text,
    messageId: messageRef.id,
    createdAt,
    isFirstMessage,
    replyToMessageId,
    replyToPreview,
  });

  const batch = api.writeBatch(db);
  if (isFirstMessage) {
    batch.set(conversationRef, writes.conversation);
    Object.entries(writes.members).forEach(([uid, member]) => {
      batch.set(api.doc(conversationRef, 'members', uid), member);
    });
  } else {
    batch.update(conversationRef, writes.conversation);
  }

  batch.set(messageRef, writes.message);
  batch.set(api.doc(db, 'users', senderUid, 'conversationStates', conversationId), writes.senderState, { merge: true });
  if (writes.recipientState) {
    batch.set(api.doc(db, 'users', recipientUid, 'conversationStates', conversationId), writes.recipientState, { merge: true });
  }
  batch.set(
    api.doc(db, 'users', recipientUid, 'notifications', messageRef.id),
    writes.recipientNotification,
  );

  await batch.commit();
  return { conversationId, messageId: messageRef.id };
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

async function buildInboxConversation({ db, uid, conversation, api }) {
  const stateSnap = await api.getDoc(api.doc(db, 'users', uid, 'conversationStates', conversation.id));
  const state = docData(stateSnap) || {};
  if (!isConversationVisible(conversation, state)) return null;

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

function subscribeUserConversations({ db, uid, onChange, onError }, api = defaultApi()) {
  const q = api.query(api.collection(db, 'conversations'), api.where('memberUids', 'array-contains', uid));

  return api.onSnapshot(q, async (snapshot) => {
    const conversations = snapshot.docs
      .map((conversationDoc) => ({ id: conversationDoc.id, ...conversationDoc.data() }))
      .filter((conversation) => conversation.type === 'dm' || conversation.type === 'group');
    const inboxRows = (await Promise.all(conversations.map((conversation) =>
      buildInboxConversation({ db, uid, conversation, api }),
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
