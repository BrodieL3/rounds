const {
  buildDirectMessageWrites,
  buildGroupMessageWrites,
  executeDirectMessageSend,
  executeGroupMessageSend,
} = require('./message-send-service');

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

function normalizeLocationLabel(label) {
  return typeof label === 'string' ? label.trim() : '';
}

function buildLocationMessagePayload({ senderUid, lat, lng, label, createdAt }) {
  const uid = requiredString(senderUid, 'senderUid');
  if (typeof lat !== 'number') throw new Error('lat must be a number');
  if (typeof lng !== 'number') throw new Error('lng must be a number');
  const normalizedLabel = normalizeLocationLabel(label);
  if (normalizedLabel.length > 240) {
    throw new Error('label must be 240 characters or fewer');
  }

  return {
    senderUid: uid,
    type: 'location',
    lat,
    lng,
    label: normalizedLabel,
    createdAt,
    deletedForEveryoneAt: null,
  };
}

function buildLocationLastMessage({ messageId, senderUid, label, createdAt }) {
  return {
    id: messageId,
    senderUid,
    type: 'location',
    label,
    createdAt,
  };
}

function buildDirectLocationMessageWrites({
  senderUid,
  recipientUid,
  lat,
  lng,
  label,
  messageId,
  createdAt,
  isFirstMessage,
}) {
  const message = buildLocationMessagePayload({ senderUid, lat, lng, label, createdAt });
  const lastMessage = buildLocationLastMessage({ messageId, senderUid, label: message.label, createdAt });

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

function buildGroupLocationMessageWrites({
  conversationId,
  memberUids = [],
  senderUid,
  lat,
  lng,
  label,
  messageId,
  createdAt,
}) {
  const message = buildLocationMessagePayload({ senderUid, lat, lng, label, createdAt });
  const lastMessage = buildLocationLastMessage({ messageId, senderUid, label: message.label, createdAt });

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

async function sendDirectLocationMessage({ db, senderUid, recipientUid, lat, lng, label }, deps = {}) {
  const api = deps.firestoreApi || defaultFirestoreApi();

  const adapter = {
    buildPayload({ messageId, createdAt }) {
      const message = buildLocationMessagePayload({ senderUid, lat, lng, label, createdAt });
      const lastMessage = buildLocationLastMessage({ messageId, senderUid, label: message.label, createdAt });
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

async function sendGroupLocationMessage({ db, conversation, senderUid, lat, lng, label }, deps = {}) {
  const api = deps.firestoreApi || defaultFirestoreApi();

  const adapter = {
    buildPayload({ messageId, createdAt }) {
      const message = buildLocationMessagePayload({ senderUid, lat, lng, label, createdAt });
      const lastMessage = buildLocationLastMessage({ messageId, senderUid, label: message.label, createdAt });
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
  buildDirectLocationMessageWrites,
  buildGroupLocationMessageWrites,
  buildLocationLastMessage,
  buildLocationMessagePayload,
  normalizeLocationLabel,
  sendDirectLocationMessage,
  sendGroupLocationMessage,
};
module.exports.__esModule = true;
