const { buildDirectConversationId, getSortedPairUids } = require('./ids');

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
  const conversationId = buildDirectConversationId(senderUid, recipientUid);
  const memberUids = getSortedPairUids(senderUid, recipientUid);
  const payload = buildLocationMessagePayload({ senderUid, lat, lng, label, createdAt });
  const lastMessage = buildLocationLastMessage({ messageId, senderUid, label: payload.label, createdAt });

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
  const payload = buildLocationMessagePayload({ senderUid, lat, lng, label, createdAt });
  const lastMessage = buildLocationLastMessage({ messageId, senderUid, label: payload.label, createdAt });
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

async function sendDirectLocationMessage({ db, senderUid, recipientUid, lat, lng, label }, deps = {}) {
  const api = deps.firestoreApi || defaultFirestoreApi();
  const conversationId = buildDirectConversationId(senderUid, recipientUid);
  const conversationRef = api.doc(db, 'conversations', conversationId);
  const messageRef = api.doc(api.collection(conversationRef, 'messages'));
  const createdAt = nowValue(api);

  const conversationSnap = await api.getDoc(conversationRef);
  const isFirstMessage = !conversationSnap.exists();

  const writes = buildDirectLocationMessageWrites({
    senderUid,
    recipientUid,
    lat,
    lng,
    label,
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

async function sendGroupLocationMessage({ db, conversation, senderUid, lat, lng, label }, deps = {}) {
  const api = deps.firestoreApi || defaultFirestoreApi();
  const conversationRef = api.doc(db, 'conversations', conversation.id);
  const messageRef = api.doc(api.collection(conversationRef, 'messages'));
  const createdAt = nowValue(api);

  const writes = buildGroupLocationMessageWrites({
    conversationId: conversation.id,
    memberUids: conversation.memberUids || [],
    senderUid,
    lat,
    lng,
    label,
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
  buildDirectLocationMessageWrites,
  buildGroupLocationMessageWrites,
  buildLocationLastMessage,
  buildLocationMessagePayload,
  normalizeLocationLabel,
  sendDirectLocationMessage,
  sendGroupLocationMessage,
};
module.exports.__esModule = true;
