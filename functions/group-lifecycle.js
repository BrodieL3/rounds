const GROUP_CHAT_MAX_MEMBERS = 25;

class GroupLifecycleError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function makeError(ErrorClass, code, message) {
  return new ErrorClass(code, message);
}

function pairId(uidA, uidB) {
  return [uidA, uidB].sort().join('_');
}

function normalizeConversationId(value, ErrorClass) {
  if (typeof value !== 'string' || !value.trim()) {
    throw makeError(ErrorClass, 'invalid-argument', 'conversationId is required');
  }
  return value.trim();
}

function normalizeUid(value, label, ErrorClass) {
  if (typeof value !== 'string' || !value.trim()) {
    throw makeError(ErrorClass, 'invalid-argument', `${label} is required`);
  }
  return value.trim();
}

function normalizeSelectedMemberUids(value, callerUid, ErrorClass) {
  if (!Array.isArray(value)) {
    throw makeError(ErrorClass, 'invalid-argument', 'selectedMemberUids must be an array');
  }
  const selected = Array.from(new Set(
    value.filter((uid) => typeof uid === 'string' && uid.trim()).map((uid) => uid.trim()),
  )).sort();
  if (selected.length === 0) throw makeError(ErrorClass, 'invalid-argument', 'Select at least one Friend');
  if (selected.includes(callerUid)) throw makeError(ErrorClass, 'invalid-argument', 'Cannot invite yourself');
  return selected;
}

function sortedWithout(values, uid) {
  return values.filter((value) => value !== uid).sort();
}

async function loadGroupContext({ db, conversationId, callerUid, ErrorClass }) {
  const conversationRef = db.collection('conversations').doc(conversationId);
  const conversationSnap = await conversationRef.get();
  if (!conversationSnap.exists) throw makeError(ErrorClass, 'not-found', 'Group not found');

  const conversation = conversationSnap.data();
  if (conversation.type !== 'group') throw makeError(ErrorClass, 'failed-precondition', 'Conversation is not a group');
  if (conversation.archivedAt != null) throw makeError(ErrorClass, 'failed-precondition', 'Group is archived');
  if (!Array.isArray(conversation.memberUids) || !conversation.memberUids.includes(callerUid)) {
    throw makeError(ErrorClass, 'permission-denied', 'You are not an active group member');
  }

  const callerMemberRef = conversationRef.collection('members').doc(callerUid);
  const callerMemberSnap = await callerMemberRef.get();
  if (!callerMemberSnap.exists || callerMemberSnap.data().leftAt != null) {
    throw makeError(ErrorClass, 'permission-denied', 'You are not an active group member');
  }

  return { conversationRef, conversation, callerMember: callerMemberSnap.data() };
}

function requireAdmin({ conversation, callerUid, ErrorClass }) {
  if (conversation.adminUid !== callerUid) {
    throw makeError(ErrorClass, 'permission-denied', 'Only the group admin can do that');
  }
}

async function assertFriendshipsExist({ db, callerUid, selectedMemberUids, ErrorClass }) {
  await Promise.all(selectedMemberUids.map(async (uid) => {
    const snap = await db.collection('friendships').doc(pairId(callerUid, uid)).get();
    if (!snap.exists) throw makeError(ErrorClass, 'permission-denied', 'Can only add Friends to a group');
  }));
}

async function inviteToGroupCallable(request, deps = {}) {
  const ErrorClass = deps.ErrorClass || GroupLifecycleError;
  const callerUid = request.auth && request.auth.uid;
  if (!callerUid) throw makeError(ErrorClass, 'unauthenticated', 'Sign in to add group members');
  const db = deps.db;
  if (!db) throw makeError(ErrorClass, 'internal', 'Firestore is not configured');

  const conversationId = normalizeConversationId(request.data && request.data.conversationId, ErrorClass);
  const selectedMemberUids = normalizeSelectedMemberUids(request.data && request.data.selectedMemberUids, callerUid, ErrorClass);
  const { conversationRef, conversation } = await loadGroupContext({ db, conversationId, callerUid, ErrorClass });
  requireAdmin({ conversation, callerUid, ErrorClass });

  const activeUids = conversation.memberUids || [];
  const alreadyActiveUid = selectedMemberUids.find((uid) => activeUids.includes(uid));
  if (alreadyActiveUid) throw makeError(ErrorClass, 'failed-precondition', 'Selected user is already in the group');
  if (activeUids.length + selectedMemberUids.length > GROUP_CHAT_MAX_MEMBERS) {
    throw makeError(ErrorClass, 'failed-precondition', 'Group member cap reached');
  }
  await assertFriendshipsExist({ db, callerUid, selectedMemberUids, ErrorClass });

  const now = typeof deps.now === 'function' ? deps.now() : new Date();
  const nextMemberUids = Array.from(new Set([...activeUids, ...selectedMemberUids])).sort();
  const batch = db.batch();
  batch.update(conversationRef, { memberUids: nextMemberUids });
  selectedMemberUids.forEach((uid) => {
    batch.set(conversationRef.collection('members').doc(uid), {
      uid,
      role: 'member',
      joinedAt: now,
      leftAt: null,
      invitedByUid: callerUid,
    });
    batch.set(db.collection('users').doc(uid).collection('conversationStates').doc(conversationId), { hiddenAt: null });
    batch.set(db.collection('users').doc(uid).collection('notifications').doc(`${conversationId}_added`), {
      type: 'added_to_group',
      actorUid: callerUid,
      conversationId,
      createdAt: now,
    });
  });
  await batch.commit();

  return { conversationId, addedMemberUids: selectedMemberUids };
}

async function removeGroupMemberCallable(request, deps = {}) {
  const ErrorClass = deps.ErrorClass || GroupLifecycleError;
  const callerUid = request.auth && request.auth.uid;
  if (!callerUid) throw makeError(ErrorClass, 'unauthenticated', 'Sign in to remove group members');
  const db = deps.db;
  if (!db) throw makeError(ErrorClass, 'internal', 'Firestore is not configured');

  const conversationId = normalizeConversationId(request.data && request.data.conversationId, ErrorClass);
  const memberUid = normalizeUid(request.data && request.data.memberUid, 'memberUid', ErrorClass);
  const { conversationRef, conversation } = await loadGroupContext({ db, conversationId, callerUid, ErrorClass });
  requireAdmin({ conversation, callerUid, ErrorClass });

  if (memberUid === callerUid) throw makeError(ErrorClass, 'invalid-argument', 'Admin must leave group instead');
  if (memberUid === conversation.adminUid) throw makeError(ErrorClass, 'failed-precondition', 'Cannot remove the group admin');
  if (!(conversation.memberUids || []).includes(memberUid)) {
    throw makeError(ErrorClass, 'failed-precondition', 'Selected user is not an active member');
  }

  const memberRef = conversationRef.collection('members').doc(memberUid);
  const memberSnap = await memberRef.get();
  if (!memberSnap.exists || memberSnap.data().leftAt != null) {
    throw makeError(ErrorClass, 'failed-precondition', 'Selected user is not an active member');
  }
  if (memberSnap.data().role === 'admin') {
    throw makeError(ErrorClass, 'failed-precondition', 'Cannot remove an admin');
  }

  const now = typeof deps.now === 'function' ? deps.now() : new Date();
  const batch = db.batch();
  batch.update(conversationRef, { memberUids: sortedWithout(conversation.memberUids || [], memberUid) });
  batch.update(memberRef, { leftAt: now });
  await batch.commit();

  return { conversationId, removedMemberUid: memberUid };
}

async function leaveGroupCallable(request, deps = {}) {
  const ErrorClass = deps.ErrorClass || GroupLifecycleError;
  const callerUid = request.auth && request.auth.uid;
  if (!callerUid) throw makeError(ErrorClass, 'unauthenticated', 'Sign in to leave group');
  const db = deps.db;
  if (!db) throw makeError(ErrorClass, 'internal', 'Firestore is not configured');

  const conversationId = normalizeConversationId(request.data && request.data.conversationId, ErrorClass);
  const { conversationRef, conversation } = await loadGroupContext({ db, conversationId, callerUid, ErrorClass });
  const activeUids = conversation.memberUids || [];
  const remainingUids = sortedWithout(activeUids, callerUid);
  const isAdmin = conversation.adminUid === callerUid;
  const nextAdminUid = request.data && request.data.nextAdminUid;

  if (isAdmin && remainingUids.length > 0) {
    if (typeof nextAdminUid !== 'string' || !remainingUids.includes(nextAdminUid)) {
      throw makeError(ErrorClass, 'failed-precondition', 'Choose the next admin before leaving');
    }
    const nextAdminSnap = await conversationRef.collection('members').doc(nextAdminUid).get();
    if (!nextAdminSnap.exists || nextAdminSnap.data().leftAt != null) {
      throw makeError(ErrorClass, 'failed-precondition', 'Next admin must be an active member');
    }
  }

  const now = typeof deps.now === 'function' ? deps.now() : new Date();
  const batch = db.batch();
  const callerMemberRef = conversationRef.collection('members').doc(callerUid);
  if (remainingUids.length === 0) {
    batch.update(conversationRef, { memberUids: [], adminUid: null, archivedAt: now });
  } else if (isAdmin) {
    batch.update(conversationRef, { memberUids: remainingUids, adminUid: nextAdminUid });
    batch.update(conversationRef.collection('members').doc(nextAdminUid), { role: 'admin' });
  } else {
    batch.update(conversationRef, { memberUids: remainingUids });
  }
  batch.update(callerMemberRef, { leftAt: now });
  await batch.commit();

  return { conversationId, leftMemberUid: callerUid, archived: remainingUids.length === 0, nextAdminUid: isAdmin ? (nextAdminUid || null) : undefined };
}

module.exports = {
  GroupLifecycleError,
  inviteToGroupCallable,
  leaveGroupCallable,
  removeGroupMemberCallable,
};
