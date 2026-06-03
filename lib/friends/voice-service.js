const {
  buildDirectMessageWrites,
  buildGroupMessageWrites,
  executeDirectMessageSend,
  executeGroupMessageSend,
} = require('./message-send-service');

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
  const message = buildVoiceMessagePayload({ senderUid, storagePath, durationMs, createdAt });
  const lastMessage = buildVoiceLastMessage({ messageId, senderUid, createdAt });

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

function buildGroupVoiceMessageWrites({
  conversationId,
  memberUids = [],
  senderUid,
  storagePath,
  durationMs,
  messageId,
  createdAt,
}) {
  const message = buildVoiceMessagePayload({ senderUid, storagePath, durationMs, createdAt });
  const lastMessage = buildVoiceLastMessage({ messageId, senderUid, createdAt });

  return buildGroupMessageWrites({
    conversationId,
    memberUids,
    senderUid,
    message,
    lastMessage,
    messageId,
    createdAt,
  });
}

function isVoicePlayableForViewer(message = {}, state = {}, now = Date.now()) {
  if (Array.isArray(message.savedBy) && message.savedBy.length > 0) return true;
  const expiresAt = message.expiresAt;
  if (!expiresAt) return true;
  return expiresAt > now;
}

async function sendDirectVoiceMessage({ db, senderUid, recipientUid, storagePath, durationMs }, deps = {}) {
  const api = deps.firestoreApi || defaultFirestoreApi();

  const adapter = {
    buildPayload({ messageId, createdAt }) {
      const message = buildVoiceMessagePayload({ senderUid, storagePath, durationMs, createdAt });
      const lastMessage = buildVoiceLastMessage({ messageId, senderUid, createdAt });
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
  return { success: true, conversationId: result.conversationId, messageId: result.messageId };
}

async function sendGroupVoiceMessage({ db, conversation, senderUid, storagePath, durationMs }, deps = {}) {
  const api = deps.firestoreApi || defaultFirestoreApi();

  const adapter = {
    buildPayload({ messageId, createdAt }) {
      const message = buildVoiceMessagePayload({ senderUid, storagePath, durationMs, createdAt });
      const lastMessage = buildVoiceLastMessage({ messageId, senderUid, createdAt });
      return { message, lastMessage };
    },
  };

  const result = await executeGroupMessageSend({
    db,
    conversation,
    senderUid,
    messageAdapter: adapter,
    api,
  });
  if (!result.success) throw new Error(result.error);
  return { success: true, conversationId: result.conversationId, messageId: result.messageId };
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
