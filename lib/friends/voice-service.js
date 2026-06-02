const { buildDirectConversationId, getSortedPairUids } = require('./ids');

const MAX_VOICE_DURATION_MS = 60000;
const VOICE_FORMAT = 'm4a';
const VOICE_EXPIRY_MS = 24 * 60 * 60 * 1000;

function defaultFirestoreApi() {
  return require('firebase/firestore');
}

function nowValue(api) {
  return api && typeof api.serverTimestamp === 'function' ? api.serverTimestamp() : new Date();
}

function requiredString(value, fieldName) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) throw new Error(`${fieldName} is required`);
  return normalized;
}

function getChatVoicePath(conversationId, timestamp) {
  if (!conversationId) throw new Error('conversationId is required');
  return `conversations/${conversationId}/voice/voice_${timestamp}.m4a`;
}

function computeVoiceExpiresAt(createdAt) {
  const base = typeof createdAt === 'number' ? createdAt : Date.now();
  return base + VOICE_EXPIRY_MS;
}

function buildVoiceMessagePayload({ senderUid, storagePath, durationMs, createdAt }) {
  const uid = requiredString(senderUid, 'senderUid');
  const path = requiredString(storagePath, 'storagePath');
  if (typeof durationMs !== 'number' || durationMs <= 0 || durationMs > MAX_VOICE_DURATION_MS) {
    throw new Error(`durationMs must be between 1 and ${MAX_VOICE_DURATION_MS}`);
  }

  return {
    senderUid: uid,
    type: 'voice',
    storagePath: path,
    durationMs,
    format: VOICE_FORMAT,
    savedBy: [],
    expiresAt: computeVoiceExpiresAt(createdAt),
    createdAt,
    deletedForEveryoneAt: null,
  };
}

function buildVoiceLastMessage({ messageId, senderUid, createdAt }) {
  return {
    id: messageId,
    senderUid,
    type: 'voice',
    createdAt,
  };
}

function buildDirectVoiceMessageWrites({
  senderUid,
  recipientUid,
  storagePath,
  durationMs,
  messageId,
  createdAt,
  isFirstMessage,
}) {
  const conversationId = buildDirectConversationId(senderUid, recipientUid);
  const memberUids = getSortedPairUids(senderUid, recipientUid);
  const payload = buildVoiceMessagePayload({ senderUid, storagePath, durationMs, createdAt });
  const lastMessage = buildVoiceLastMessage({ messageId, senderUid, createdAt });

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

  return {
    conversationId,
    conversation,
    members: isFirstMessage
      ? {
        [memberUids[0]]: { uid: memberUids[0], role: 'member', joinedAt: createdAt, leftAt: null },
        [memberUids[1]]: { uid: memberUids[1], role: 'member', joinedAt: createdAt, leftAt: null },
      }
      : null,
    message: payload,
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

function buildGroupVoiceMessageWrites({
  conversationId,
  memberUids = [],
  senderUid,
  storagePath,
  durationMs,
  messageId,
  createdAt,
}) {
  const payload = buildVoiceMessagePayload({ senderUid, storagePath, durationMs, createdAt });
  const lastMessage = buildVoiceLastMessage({ messageId, senderUid, createdAt });
  const recipientNotifications = memberUids
    .filter((uid) => uid !== senderUid)
    .reduce((notifications, uid) => ({
      ...notifications,
      [uid]: {
        type: 'new_group_message',
        actorUid: senderUid,
        conversationId,
        createdAt,
      },
    }), {});

  return {
    conversationUpdate: {
      lastMessageAt: createdAt,
      lastMessage,
    },
    message: payload,
    senderState: { hiddenAt: null, lastSeenAt: createdAt },
    recipientNotifications,
  };
}

function isVoicePlayableForViewer(message = {}, state = {}, now = Date.now()) {
  if (Array.isArray(message.savedBy) && message.savedBy.length > 0) return true;
  const expiresAt = message.expiresAt;
  if (!expiresAt) return true;
  return expiresAt > now;
}

async function sendDirectVoiceMessage({ db, senderUid, recipientUid, storagePath, durationMs }, deps = {}) {
  const api = deps.firestoreApi || defaultFirestoreApi();
  const conversationId = buildDirectConversationId(senderUid, recipientUid);
  const conversationRef = api.doc(db, 'conversations', conversationId);
  const messageRef = api.doc(api.collection(conversationRef, 'messages'));
  const createdAt = nowValue(api);

  const conversationSnap = await api.getDoc(conversationRef);
  const isFirstMessage = !conversationSnap.exists();

  const writes = buildDirectVoiceMessageWrites({
    senderUid,
    recipientUid,
    storagePath,
    durationMs,
    messageId: messageRef.id,
    createdAt,
    isFirstMessage,
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
  batch.set(api.doc(db, 'users', recipientUid, 'notifications', messageRef.id), writes.recipientNotification);

  await batch.commit();
  return { success: true, conversationId, messageId: messageRef.id };
}

async function sendGroupVoiceMessage({ db, conversation, senderUid, storagePath, durationMs }, deps = {}) {
  const api = deps.firestoreApi || defaultFirestoreApi();
  const conversationRef = api.doc(db, 'conversations', conversation.id);
  const messageRef = api.doc(api.collection(conversationRef, 'messages'));
  const createdAt = nowValue(api);

  const writes = buildGroupVoiceMessageWrites({
    conversationId: conversation.id,
    memberUids: conversation.memberUids || [],
    senderUid,
    storagePath,
    durationMs,
    messageId: messageRef.id,
    createdAt,
  });

  const batch = api.writeBatch(db);
  batch.update(conversationRef, writes.conversationUpdate);
  batch.set(messageRef, writes.message);
  batch.set(api.doc(db, 'users', senderUid, 'conversationStates', conversation.id), writes.senderState, { merge: true });
  Object.entries(writes.recipientNotifications).forEach(([uid, notification]) => {
    batch.set(api.doc(db, 'users', uid, 'notifications', messageRef.id), notification);
  });

  await batch.commit();
  return { success: true, conversationId: conversation.id, messageId: messageRef.id };
}

module.exports = {
  MAX_VOICE_DURATION_MS,
  VOICE_FORMAT,
  VOICE_EXPIRY_MS,
  buildDirectVoiceMessageWrites,
  buildGroupVoiceMessageWrites,
  buildVoiceLastMessage,
  buildVoiceMessagePayload,
  computeVoiceExpiresAt,
  getChatVoicePath,
  isVoicePlayableForViewer,
  sendDirectVoiceMessage,
  sendGroupVoiceMessage,
};
module.exports.__esModule = true;
