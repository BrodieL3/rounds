const {
  buildBlockUserWrites,
} = require('../lib/friends/safety-service');

class SafetyError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function makeError(ErrorClass, code, message) {
  return new ErrorClass(code, message);
}

function normalizeUid(value, label, ErrorClass) {
  if (typeof value !== 'string' || !value.trim()) {
    throw makeError(ErrorClass, 'invalid-argument', `${label} is required`);
  }
  return value.trim();
}

function normalizeId(value, label, ErrorClass) {
  if (typeof value !== 'string' || !value.trim()) {
    throw makeError(ErrorClass, 'invalid-argument', `${label} is required`);
  }
  return value.trim();
}

function getFieldValue(deps) {
  if (deps.FieldValue) return deps.FieldValue;
  // Loaded lazily so pure callable tests do not need firebase-admin.
  return require('firebase-admin').firestore.FieldValue;
}

async function updatePendingRequestIfExists({ batch, requestRef, now }) {
  const snap = await requestRef.get();
  if (!snap.exists) return;
  const data = snap.data();
  if (data.status === 'pending') {
    batch.update(requestRef, { status: 'canceled', respondedAt: now });
  }
}

async function blockUserCallable(request, deps = {}) {
  const ErrorClass = deps.ErrorClass || SafetyError;
  const blockerUid = request.auth && request.auth.uid;
  if (!blockerUid) throw makeError(ErrorClass, 'unauthenticated', 'Sign in to block users');
  const blockedUid = normalizeUid(request.data && request.data.blockedUid, 'blockedUid', ErrorClass);
  if (blockerUid === blockedUid) throw makeError(ErrorClass, 'invalid-argument', 'Cannot block yourself');

  const db = deps.db;
  if (!db) throw makeError(ErrorClass, 'internal', 'Firestore is not configured');
  const now = typeof deps.now === 'function' ? deps.now() : new Date();
  const FieldValue = getFieldValue(deps);
  const writes = buildBlockUserWrites({ blockerUid, blockedUid, createdAt: now });

  const batch = db.batch();
  batch.set(db.collection('blocks').doc(writes.blockId), writes.block);
  batch.delete(db.collection('friendships').doc(writes.friendshipId));
  batch.update(db.collection('users').doc(blockerUid), {
    followers: FieldValue.arrayRemove(blockedUid),
    following: FieldValue.arrayRemove(blockedUid),
  });
  batch.update(db.collection('users').doc(blockedUid), {
    followers: FieldValue.arrayRemove(blockerUid),
    following: FieldValue.arrayRemove(blockerUid),
  });

  await Promise.all(writes.pendingRequestIds.map((requestId) => updatePendingRequestIfExists({
    batch,
    requestRef: db.collection('friendRequests').doc(requestId),
    now,
  })));

  const dmSnap = await db.collection('conversations').doc(writes.dmConversationId).get();
  if (dmSnap.exists) {
    batch.set(
      db.collection('users').doc(blockerUid).collection('conversationStates').doc(writes.dmConversationId),
      writes.blockerConversationState,
      { merge: true },
    );
  }

  await batch.commit();
  return { blockedUid };
}

async function deleteMessageForEveryoneCallable(request, deps = {}) {
  const ErrorClass = deps.ErrorClass || SafetyError;
  const callerUid = request.auth && request.auth.uid;
  if (!callerUid) throw makeError(ErrorClass, 'unauthenticated', 'Sign in to delete messages');
  const conversationId = normalizeId(request.data && request.data.conversationId, 'conversationId', ErrorClass);
  const messageId = normalizeId(request.data && request.data.messageId, 'messageId', ErrorClass);
  const db = deps.db;
  if (!db) throw makeError(ErrorClass, 'internal', 'Firestore is not configured');
  const now = typeof deps.now === 'function' ? deps.now() : new Date();

  const conversationRef = db.collection('conversations').doc(conversationId);
  const messageRef = conversationRef.collection('messages').doc(messageId);
  const [conversationSnap, messageSnap] = await Promise.all([conversationRef.get(), messageRef.get()]);
  if (!conversationSnap.exists) throw makeError(ErrorClass, 'not-found', 'Conversation not found');
  if (!messageSnap.exists) throw makeError(ErrorClass, 'not-found', 'Message not found');

  const conversation = conversationSnap.data();
  const message = messageSnap.data();
  if (!Array.isArray(conversation.memberUids) || !conversation.memberUids.includes(callerUid)) {
    throw makeError(ErrorClass, 'permission-denied', 'You are not a conversation member');
  }
  if (message.senderUid !== callerUid) {
    throw makeError(ErrorClass, 'permission-denied', 'Only the sender can delete this message');
  }

  const batch = db.batch();
  batch.update(messageRef, { deletedForEveryoneAt: now });
  if (conversation.lastMessage && conversation.lastMessage.id === messageId) {
    batch.update(conversationRef, {
      lastMessage: { ...conversation.lastMessage, deletedForEveryoneAt: now },
    });
  }
  await batch.commit();

  return { conversationId, messageId };
}

module.exports = {
  SafetyError,
  blockUserCallable,
  deleteMessageForEveryoneCallable,
};
