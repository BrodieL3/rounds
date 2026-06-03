const {
  buildDirectMessageWrites,
  buildGroupMessageWrites,
  executeDirectMessageSend,
  executeGroupMessageSend,
} = require('./message-send-service');

function defaultApi() {
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

function optionalString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeVenueLinkPayload({ venue, cityKey } = {}) {
  const venueId = requiredString(venue?.id || venue?.venueId, 'venueId');
  const venueName = requiredString(venue?.name || venue?.venueName, 'venueName');
  const venueCohort = requiredString(venue?.cohort || venue?.venueCohort, 'venueCohort');
  const venueCity = requiredString(venue?.city || venue?.venueCity || cityKey, 'venueCity');
  const venueAddress = optionalString(venue?.address || venue?.venueAddress);

  return {
    venueId,
    venueName,
    venueCohort,
    venueCity,
    venueAddress,
  };
}

function buildVenueLinkPayload({ senderUid, venue, cityKey, messageId, createdAt }) {
  const uid = requiredString(senderUid, 'senderUid');
  const id = requiredString(messageId, 'messageId');
  const venuePayload = normalizeVenueLinkPayload({ venue, cityKey });
  const lastMessage = {
    id,
    senderUid: uid,
    type: 'venue_link',
    ...venuePayload,
    createdAt,
  };

  return {
    lastMessage,
    message: {
      senderUid: uid,
      type: 'venue_link',
      ...venuePayload,
      createdAt,
      deletedForEveryoneAt: null,
    },
  };
}

function buildDirectVenueLinkMessageWrites({
  senderUid,
  recipientUid,
  venue,
  cityKey,
  messageId,
  createdAt,
  isFirstMessage,
}) {
  const payload = buildVenueLinkPayload({ senderUid, venue, cityKey, messageId, createdAt });

  return buildDirectMessageWrites({
    senderUid,
    recipientUid,
    message: payload.message,
    lastMessage: payload.lastMessage,
    messageId,
    createdAt,
    isFirstMessage,
  });
}

function buildGroupVenueLinkMessageWrites({
  conversationId,
  memberUids = [],
  senderUid,
  venue,
  cityKey,
  messageId,
  createdAt,
}) {
  const payload = buildVenueLinkPayload({ senderUid, venue, cityKey, messageId, createdAt });

  return buildGroupMessageWrites({
    conversationId,
    memberUids,
    senderUid,
    message: payload.message,
    lastMessage: payload.lastMessage,
    messageId,
    createdAt,
  });
}

async function sendDirectVenueLinkMessage({ db, senderUid, recipientUid, venue, cityKey }, api = defaultApi()) {
  const adapter = {
    buildPayload({ messageId, createdAt }) {
      const payload = buildVenueLinkPayload({ senderUid, venue, cityKey, messageId, createdAt });
      return { message: payload.message, lastMessage: payload.lastMessage };
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

async function sendGroupVenueLinkMessage({ db, conversation, senderUid, venue, cityKey }, api = defaultApi()) {
  const adapter = {
    buildPayload({ messageId, createdAt }) {
      const payload = buildVenueLinkPayload({ senderUid, venue, cityKey, messageId, createdAt });
      return { message: payload.message, lastMessage: payload.lastMessage };
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
  return { conversationId: result.conversationId, messageId: result.messageId };
}

module.exports = {
  buildDirectVenueLinkMessageWrites,
  buildGroupVenueLinkMessageWrites,
  buildVenueLinkPayload,
  normalizeVenueLinkPayload,
  sendDirectVenueLinkMessage,
  sendGroupVenueLinkMessage,
};
module.exports.__esModule = true;
