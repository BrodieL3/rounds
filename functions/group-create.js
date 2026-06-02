const MAX_GROUP_NAME_LENGTH = 60;
const MIN_SELECTED_GROUP_FRIENDS = 2;
const MAX_SELECTED_GROUP_FRIENDS = 24;

class GroupCreateError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function makeError(ErrorClass, code, message) {
  return new ErrorClass(code, message);
}

function normalizeGroupName(name, ErrorClass = GroupCreateError) {
  const normalized = typeof name === 'string' ? name.trim() : '';
  if (!normalized) throw makeError(ErrorClass, 'invalid-argument', 'Group name is required');
  if (normalized.length > MAX_GROUP_NAME_LENGTH) {
    throw makeError(ErrorClass, 'invalid-argument', `Group name must be ${MAX_GROUP_NAME_LENGTH} characters or fewer`);
  }
  return normalized;
}

function normalizeSelectedMemberUids(selectedMemberUids, creatorUid, ErrorClass = GroupCreateError) {
  if (!Array.isArray(selectedMemberUids)) {
    throw makeError(ErrorClass, 'invalid-argument', 'Select friends for the group');
  }

  const unique = Array.from(new Set(
    selectedMemberUids.filter((uid) => typeof uid === 'string' && uid.trim()).map((uid) => uid.trim()),
  )).sort();

  if (unique.includes(creatorUid)) {
    throw makeError(ErrorClass, 'invalid-argument', 'Creator cannot be selected as an invitee');
  }
  if (unique.length < MIN_SELECTED_GROUP_FRIENDS) {
    throw makeError(ErrorClass, 'invalid-argument', `Select at least ${MIN_SELECTED_GROUP_FRIENDS} friends`);
  }
  if (unique.length > MAX_SELECTED_GROUP_FRIENDS) {
    throw makeError(ErrorClass, 'invalid-argument', `Select ${MAX_SELECTED_GROUP_FRIENDS} friends or fewer`);
  }
  return unique;
}

function pairId(uidA, uidB) {
  return [uidA, uidB].sort().join('_');
}

function buildGroupCreateDocuments({ conversationId, creatorUid, selectedMemberUids, name, createdAt }) {
  const memberUids = Array.from(new Set([creatorUid, ...selectedMemberUids])).sort();
  const members = memberUids.reduce((docs, uid) => ({
    ...docs,
    [uid]: {
      uid,
      role: uid === creatorUid ? 'admin' : 'member',
      joinedAt: createdAt,
      leftAt: null,
      invitedByUid: uid === creatorUid ? null : creatorUid,
    },
  }), {});
  const states = memberUids.reduce((docs, uid) => ({
    ...docs,
    [uid]: uid === creatorUid ? { hiddenAt: null, lastSeenAt: createdAt } : { hiddenAt: null },
  }), {});
  const notifications = selectedMemberUids.reduce((docs, uid) => ({
    ...docs,
    [uid]: {
      type: 'added_to_group',
      actorUid: creatorUid,
      conversationId,
      createdAt,
    },
  }), {});

  return {
    conversation: {
      type: 'group',
      memberUids,
      adminUid: creatorUid,
      name,
      photoUrl: null,
      createdAt,
      createdByUid: creatorUid,
      lastMessageAt: null,
      lastMessage: null,
      archivedAt: null,
    },
    members,
    states,
    notifications,
  };
}

async function assertFriendshipsExist({ db, creatorUid, selectedMemberUids, ErrorClass }) {
  await Promise.all(selectedMemberUids.map(async (uid) => {
    const [friendshipSnap, creatorBlockSnap, inviteeBlockSnap] = await Promise.all([
      db.collection('friendships').doc(pairId(creatorUid, uid)).get(),
      db.collection('blocks').doc(`${creatorUid}_${uid}`).get(),
      db.collection('blocks').doc(`${uid}_${creatorUid}`).get(),
    ]);
    if (!friendshipSnap.exists) {
      throw makeError(ErrorClass, 'permission-denied', 'Group members must be Friends');
    }
    if (creatorBlockSnap.exists || inviteeBlockSnap.exists) {
      throw makeError(ErrorClass, 'permission-denied', 'Cannot invite blocked users to a group');
    }
  }));
}

async function createGroupConversationCallable(request, deps = {}) {
  const ErrorClass = deps.ErrorClass || GroupCreateError;
  const authUid = request.auth && request.auth.uid;
  if (!authUid) throw makeError(ErrorClass, 'unauthenticated', 'Sign in to create a group');

  const db = deps.db;
  if (!db) throw makeError(ErrorClass, 'internal', 'Firestore is not configured');

  const name = normalizeGroupName(request.data && request.data.name, ErrorClass);
  const selectedMemberUids = normalizeSelectedMemberUids(
    request.data && request.data.selectedMemberUids,
    authUid,
    ErrorClass,
  );

  await assertFriendshipsExist({ db, creatorUid: authUid, selectedMemberUids, ErrorClass });

  const conversationRef = db.collection('conversations').doc();
  const createdAt = typeof deps.now === 'function' ? deps.now() : new Date();
  const docs = buildGroupCreateDocuments({
    conversationId: conversationRef.id,
    creatorUid: authUid,
    selectedMemberUids,
    name,
    createdAt,
  });

  const batch = db.batch();
  batch.set(conversationRef, docs.conversation);
  Object.entries(docs.members).forEach(([uid, member]) => {
    batch.set(conversationRef.collection('members').doc(uid), member);
  });
  Object.entries(docs.states).forEach(([uid, state]) => {
    batch.set(db.collection('users').doc(uid).collection('conversationStates').doc(conversationRef.id), state);
  });
  Object.entries(docs.notifications).forEach(([uid, notification]) => {
    batch.set(db.collection('users').doc(uid).collection('notifications').doc(`${conversationRef.id}_added`), notification);
  });
  await batch.commit();

  return { conversationId: conversationRef.id };
}

module.exports = {
  GroupCreateError,
  buildGroupCreateDocuments,
  createGroupConversationCallable,
  normalizeGroupName,
  normalizeSelectedMemberUids,
};
