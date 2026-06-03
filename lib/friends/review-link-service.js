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

function normalizeReviewLinkPayload({ review } = {}) {
  const ratingId = requiredString(review?.ratingId, 'ratingId');
  const venueId = requiredString(review?.venueId, 'venueId');
  const venueName = requiredString(review?.venueName, 'venueName');
  const venueCohort = requiredString(review?.venueCohort, 'venueCohort');
  const sentiment = requiredString(review?.sentiment, 'sentiment');
  const visibility = review?.visibility;

  if (!['loved', 'fine', 'disliked'].includes(sentiment)) {
    throw new Error('sentiment must be loved, fine, or disliked');
  }

  const payload = {
    ratingId,
    venueId,
    venueName,
    venueCohort,
    sentiment,
    authorDisplayName: optionalString(review?.authorDisplayName),
    authorUsername: optionalString(review?.authorUsername),
    notes: optionalString(review?.notes),
  };

  if (visibility) {
    payload.visibility = visibility;
  }

  return payload;
}

function buildReviewLinkPayload({ senderUid, review, messageId, createdAt }) {
  const uid = requiredString(senderUid, 'senderUid');
  const id = requiredString(messageId, 'messageId');
  const reviewPayload = normalizeReviewLinkPayload({ review });

  const lastMessage = {
    id,
    senderUid: uid,
    type: 'review_link',
    ...reviewPayload,
    createdAt,
  };

  return {
    lastMessage,
    message: {
      senderUid: uid,
      type: 'review_link',
      ...reviewPayload,
      createdAt,
      deletedForEveryoneAt: null,
    },
  };
}

function buildDirectReviewLinkMessageWrites({
  senderUid,
  recipientUid,
  review,
  messageId,
  createdAt,
  isFirstMessage,
}) {
  const payload = buildReviewLinkPayload({ senderUid, review, messageId, createdAt });

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

function buildGroupReviewLinkMessageWrites({
  conversationId,
  memberUids = [],
  senderUid,
  review,
  messageId,
  createdAt,
}) {
  const payload = buildReviewLinkPayload({ senderUid, review, messageId, createdAt });

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

async function sendDirectReviewLinkMessage({ db, senderUid, recipientUid, review }, api = defaultApi()) {
  const adapter = {
    buildPayload({ messageId, createdAt }) {
      const payload = buildReviewLinkPayload({ senderUid, review, messageId, createdAt });
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

async function sendGroupReviewLinkMessage({ db, conversation, senderUid, review }, api = defaultApi()) {
  const adapter = {
    buildPayload({ messageId, createdAt }) {
      const payload = buildReviewLinkPayload({ senderUid, review, messageId, createdAt });
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
  buildDirectReviewLinkMessageWrites,
  buildGroupReviewLinkMessageWrites,
  buildReviewLinkPayload,
  normalizeReviewLinkPayload,
  sendDirectReviewLinkMessage,
  sendGroupReviewLinkMessage,
};
module.exports.__esModule = true;
