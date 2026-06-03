const { buildDirectConversationId, getSortedPairUids } = require('./ids');

function defaultApi() {
  return require('firebase/firestore');
}

function nowValue(api) {
  return api && typeof api.serverTimestamp === 'function' ? api.serverTimestamp() : new Date();
}

function buildDirectMessageWrites({
  senderUid,
  recipientUid,
  message,
  lastMessage,
  messageId,
  createdAt,
  isFirstMessage,
}) {
  const conversationId = buildDirectConversationId(senderUid, recipientUid);
  const memberUids = getSortedPairUids(senderUid, recipientUid);

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

function buildGroupMessageWrites({
  conversationId,
  memberUids = [],
  senderUid,
  message,
  lastMessage,
  messageId,
  createdAt,
}) {
  const recipientNotifications = memberUids
    .filter((uid) => uid !== senderUid)
    .reduce(
      (notifications, uid) => ({
        ...notifications,
        [uid]: {
          type: 'new_group_message',
          actorUid: senderUid,
          conversationId,
          createdAt,
        },
      }),
      {},
    );

  return {
    conversationUpdate: {
      lastMessageAt: createdAt,
      lastMessage,
    },
    message,
    senderState: { hiddenAt: null, lastSeenAt: createdAt },
    recipientNotifications,
  };
}

async function executeDirectMessageSend({
  db,
  senderUid,
  recipientUid,
  messageAdapter,
  api = defaultApi(),
}) {
  const conversationId = buildDirectConversationId(senderUid, recipientUid);
  const conversationRef = api.doc(db, 'conversations', conversationId);
  const messageRef = api.doc(api.collection(conversationRef, 'messages'));
  const createdAt = nowValue(api);

  const conversationSnap = await api.getDoc(conversationRef);
  const isFirstMessage = !conversationSnap.exists();

  let prepareResult = { success: true };
  if (messageAdapter.prepare) {
    prepareResult = await messageAdapter.prepare({
      conversationId,
      messageId: messageRef.id,
      createdAt,
    });
    if (!prepareResult.success) {
      return { success: false, error: prepareResult.error, conversationId };
    }
  }

  let payloadResult;
  try {
    payloadResult = messageAdapter.buildPayload({
      messageId: messageRef.id,
      createdAt,
      context: prepareResult.context,
    });
  } catch (error) {
    return { success: false, error: error?.message || String(error), conversationId };
  }

  const writes = buildDirectMessageWrites({
    senderUid,
    recipientUid,
    message: payloadResult.message,
    lastMessage: payloadResult.lastMessage,
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
  batch.set(
    api.doc(db, 'users', senderUid, 'conversationStates', conversationId),
    writes.senderState,
    { merge: true },
  );
  if (writes.recipientState) {
    batch.set(
      api.doc(db, 'users', recipientUid, 'conversationStates', conversationId),
      writes.recipientState,
      { merge: true },
    );
  }
  batch.set(
    api.doc(db, 'users', recipientUid, 'notifications', messageRef.id),
    writes.recipientNotification,
  );

  try {
    await batch.commit();
    return {
      success: true,
      conversationId,
      messageId: messageRef.id,
      context: prepareResult.context,
    };
  } catch (error) {
    if (messageAdapter.cleanup) {
      try {
        await messageAdapter.cleanup(prepareResult.context);
      } catch (_) {
        // Best-effort cleanup only.
      }
    }
    return { success: false, error: error?.message || String(error), conversationId };
  }
}

async function executeGroupMessageSend({
  db,
  conversation,
  senderUid,
  messageAdapter,
  api = defaultApi(),
}) {
  const conversationRef = api.doc(db, 'conversations', conversation.id);
  const messageRef = api.doc(api.collection(conversationRef, 'messages'));
  const createdAt = nowValue(api);

  let prepareResult = { success: true };
  if (messageAdapter.prepare) {
    prepareResult = await messageAdapter.prepare({
      conversationId: conversation.id,
      messageId: messageRef.id,
      createdAt,
    });
    if (!prepareResult.success) {
      return { success: false, error: prepareResult.error, conversationId: conversation.id };
    }
  }

  let payloadResult;
  try {
    payloadResult = messageAdapter.buildPayload({
      messageId: messageRef.id,
      createdAt,
      context: prepareResult.context,
    });
  } catch (error) {
    return { success: false, error: error?.message || String(error), conversationId: conversation.id };
  }

  const writes = buildGroupMessageWrites({
    conversationId: conversation.id,
    memberUids: conversation.memberUids || [],
    senderUid,
    message: payloadResult.message,
    lastMessage: payloadResult.lastMessage,
    messageId: messageRef.id,
    createdAt,
  });

  const batch = api.writeBatch(db);
  batch.update(conversationRef, writes.conversationUpdate);
  batch.set(messageRef, writes.message);
  batch.set(
    api.doc(db, 'users', senderUid, 'conversationStates', conversation.id),
    writes.senderState,
    { merge: true },
  );
  Object.entries(writes.recipientNotifications).forEach(([uid, notification]) => {
    batch.set(api.doc(db, 'users', uid, 'notifications', messageRef.id), notification);
  });

  try {
    await batch.commit();
    return {
      success: true,
      conversationId: conversation.id,
      messageId: messageRef.id,
      context: prepareResult.context,
    };
  } catch (error) {
    if (messageAdapter.cleanup) {
      try {
        await messageAdapter.cleanup(prepareResult.context);
      } catch (_) {
        // Best-effort cleanup only.
      }
    }
    return { success: false, error: error?.message || String(error), conversationId: conversation.id };
  }
}

module.exports = {
  buildDirectMessageWrites,
  buildGroupMessageWrites,
  executeDirectMessageSend,
  executeGroupMessageSend,
};
module.exports.__esModule = true;
