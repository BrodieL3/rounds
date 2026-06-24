const { buildBlockId, buildDirectConversationId, buildFriendRequestId, buildFriendshipId } = require('./ids');

const REPORT_TARGET_TYPES = Object.freeze(['user', 'message', 'group', 'review_tag']);

function defaultFunctionsApi() {
  return require('firebase/functions');
}

function defaultFirestoreApi() {
  return require('firebase/firestore');
}

function assertUid(uid, label) {
  if (typeof uid !== 'string' || !uid.trim()) throw new Error(`${label} is required`);
  return uid.trim();
}

function assertTargetId(targetId) {
  if (typeof targetId !== 'string' || !targetId.trim()) throw new Error('targetId is required');
  return targetId.trim();
}

function normalizeReason(reason) {
  const normalized = typeof reason === 'string' ? reason.trim() : '';
  if (!normalized) throw new Error('Report reason is required');
  if (normalized.length > 1000) throw new Error('Report reason must be 1000 characters or fewer');
  return normalized;
}

function buildBlockUserWrites({ blockerUid, blockedUid, createdAt }) {
  const blocker = assertUid(blockerUid, 'blockerUid');
  const blocked = assertUid(blockedUid, 'blockedUid');

  return {
    blockId: buildBlockId(blocker, blocked),
    block: { blockerUid: blocker, blockedUid: blocked, createdAt },
    friendshipId: buildFriendshipId(blocker, blocked),
    pendingRequestIds: [buildFriendRequestId(blocker, blocked), buildFriendRequestId(blocked, blocker)],
    dmConversationId: buildDirectConversationId(blocker, blocked),
    blockerConversationState: { hiddenAt: createdAt },
    followRemovals: {
      [blocker]: { followersRemove: blocked, followingRemove: blocked },
      [blocked]: { followersRemove: blocker, followingRemove: blocker },
    },
  };
}

function buildHideMessageForSelfUpdate({ currentHiddenMessageIds = [], messageId }) {
  const id = assertTargetId(messageId);
  const hiddenMessageIds = Array.from(new Set([
    ...(Array.isArray(currentHiddenMessageIds) ? currentHiddenMessageIds.filter((value) => typeof value === 'string') : []),
    id,
  ]));
  return { hiddenMessageIds };
}

function isMessageVisibleForViewer(message = {}, state = {}) {
  return !(Array.isArray(state.hiddenMessageIds) && state.hiddenMessageIds.includes(message.id));
}

function buildReportPayload({
  reporterUid,
  targetType,
  targetId,
  reason,
  conversationId,
  messageId,
  ratingId,
  reportedUid,
  createdAt,
}) {
  const type = typeof targetType === 'string' ? targetType.trim() : '';
  if (!REPORT_TARGET_TYPES.includes(type)) throw new Error('Unsupported report target type');

  const payload = {
    reporterUid: assertUid(reporterUid, 'reporterUid'),
    targetType: type,
    targetId: assertTargetId(targetId),
    reason: normalizeReason(reason),
    createdAt,
    status: 'open',
  };

  if (conversationId) payload.conversationId = String(conversationId).trim();
  if (messageId) payload.messageId = String(messageId).trim();
  if (ratingId) payload.ratingId = String(ratingId).trim();
  if (reportedUid) payload.reportedUid = String(reportedUid).trim();

  return payload;
}

function buildNotificationPushPreview(notification = {}) {
  const isMessage = notification.type === 'new_direct_message' || notification.type === 'new_group_message';
  if (isMessage) {
    return {
      title: notification.conversationName || notification.actorDisplayName || 'Rounds',
      body: 'New message',
    };
  }
  if (notification.type === 'friend_request_received') {
    return { title: notification.actorDisplayName || 'Rounds', body: 'Friend request' };
  }
  if (notification.type === 'friend_request_accepted') {
    return { title: notification.actorDisplayName || 'Rounds', body: 'Friend request accepted' };
  }
  if (notification.type === 'added_to_group') {
    return { title: notification.conversationName || 'Rounds', body: 'Added to group chat' };
  }
  return { title: 'Rounds', body: 'New notification' };
}

async function blockUser({ functions, blockedUid }, api = defaultFunctionsApi()) {
  const block = api.httpsCallable(functions, 'blockUser');
  const result = await block({ blockedUid: assertUid(blockedUid, 'blockedUid') });
  return result.data;
}

async function deleteMessageForEveryone({ functions, conversationId, messageId }, api = defaultFunctionsApi()) {
  const deleteMessage = api.httpsCallable(functions, 'deleteMessageForEveryone');
  const result = await deleteMessage({
    conversationId: assertTargetId(conversationId),
    messageId: assertTargetId(messageId),
  });
  return result.data;
}

async function reportTarget({ db, report }, api = defaultFirestoreApi()) {
  const reportRef = api.doc(api.collection(db, 'reports'));
  await api.setDoc(reportRef, report);
  return { reportId: reportRef.id };
}

async function hideMessageForSelf({ db, uid, conversationId, messageId }, api = defaultFirestoreApi()) {
  const stateRef = api.doc(db, 'users', uid, 'conversationStates', conversationId);
  const stateSnap = await api.getDoc(stateRef);
  const state = stateSnap.exists() ? stateSnap.data() : {};
  const update = buildHideMessageForSelfUpdate({
    currentHiddenMessageIds: state.hiddenMessageIds,
    messageId,
  });
  await api.setDoc(stateRef, update, { merge: true });
  return update;
}

module.exports = {
  REPORT_TARGET_TYPES,
  blockUser,
  buildBlockUserWrites,
  buildHideMessageForSelfUpdate,
  buildNotificationPushPreview,
  buildReportPayload,
  deleteMessageForEveryone,
  hideMessageForSelf,
  isMessageVisibleForViewer,
  reportTarget,
};
module.exports.__esModule = true;
