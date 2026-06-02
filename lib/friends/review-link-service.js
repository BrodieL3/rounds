const { buildDirectConversationId, getSortedPairUids } = require('./ids');

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

  if (!['loved', 'fine', 'disliked'].includes(sentiment)) {
    throw new Error('sentiment must be loved, fine, or disliked');
  }

  return {
    ratingId,
    venueId,
    venueName,
    venueCohort,
    sentiment,
    authorDisplayName: optionalString(review?.authorDisplayName),
    authorUsername: optionalString(review?.authorUsername),
    notes: optionalString(review?.notes),
  };
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
  const conversationId = buildDirectConversationId(senderUid, recipientUid);
  const memberUids = getSortedPairUids(senderUid, recipientUid);
  const payload = buildReviewLinkPayload({ senderUid, review, messageId, createdAt });

  const conversation = isFirstMessage
    ? {
      type: 'dm',
      memberUids,
      createdAt,
      createdByUid: senderUid,
      lastMessageAt: createdAt,
      lastMessage: payload.lastMessage,
    }
    : {
      lastMessageAt: createdAt,
      lastMessage: payload.lastMessage,
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
    message: payload.message,
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

function buildGroupReviewLinkMessageWrites({
  conversationId,
  memberUids = [],
  senderUid,
  review,
  messageId,
  createdAt,
}) {
  const payload = buildReviewLinkPayload({ senderUid, review, messageId, createdAt });
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
      lastMessage: payload.lastMessage,
    },
    message: payload.message,
    senderState: { hiddenAt: null, lastSeenAt: createdAt },
    recipientNotifications,
  };
}

async function sendDirectReviewLinkMessage({ db, senderUid, recipientUid, review }, api = defaultApi()) {
  const conversationId = buildDirectConversationId(senderUid, recipientUid);
  const conversationRef = api.doc(db, 'conversations', conversationId);
  const messageRef = api.doc(api.collection(conversationRef, 'messages'));
  const createdAt = nowValue(api);
  const conversationSnap = await api.getDoc(conversationRef);
  const isFirstMessage = !conversationSnap.exists();

  const writes = buildDirectReviewLinkMessageWrites({
    senderUid,
    recipientUid,
    review,
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
  return { conversationId, messageId: messageRef.id };
}

async function sendGroupReviewLinkMessage({ db, conversation, senderUid, review }, api = defaultApi()) {
  const conversationRef = api.doc(db, 'conversations', conversation.id);
  const messageRef = api.doc(api.collection(conversationRef, 'messages'));
  const createdAt = nowValue(api);

  const writes = buildGroupReviewLinkMessageWrites({
    conversationId: conversation.id,
    memberUids: conversation.memberUids || [],
    senderUid,
    review,
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
  return { conversationId: conversation.id, messageId: messageRef.id };
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
