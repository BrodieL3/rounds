const { normalizeTextMessage } = require('./dm-service');

const MAX_GROUP_NAME_LENGTH = 60;
const MIN_SELECTED_GROUP_FRIENDS = 2;
const MAX_SELECTED_GROUP_FRIENDS = 24;

function defaultFunctionsApi() {
  return require('firebase/functions');
}

function defaultFirestoreApi() {
  return require('firebase/firestore');
}

function nowValue(api) {
  return api && typeof api.serverTimestamp === 'function' ? api.serverTimestamp() : new Date();
}

function normalizeGroupName(name) {
  const normalized = typeof name === 'string' ? name.trim() : '';
  if (!normalized) throw new Error('Group name is required');
  if (normalized.length > MAX_GROUP_NAME_LENGTH) {
    throw new Error(`Group name must be ${MAX_GROUP_NAME_LENGTH} characters or fewer`);
  }
  return normalized;
}

function normalizeSelectedMemberUids(selectedMemberUids = []) {
  const unique = Array.from(new Set(
    selectedMemberUids.filter((uid) => typeof uid === 'string' && uid.trim()).map((uid) => uid.trim()),
  )).sort();

  if (unique.length < MIN_SELECTED_GROUP_FRIENDS) {
    throw new Error(`Select at least ${MIN_SELECTED_GROUP_FRIENDS} friends`);
  }
  if (unique.length > MAX_SELECTED_GROUP_FRIENDS) {
    throw new Error(`Select ${MAX_SELECTED_GROUP_FRIENDS} friends or fewer`);
  }
  return unique;
}

function assertConversationId(conversationId) {
  if (typeof conversationId !== 'string' || !conversationId.trim()) {
    throw new Error('conversationId is required');
  }
  return conversationId.trim();
}

function buildGroupCreateRequest({ name, selectedMemberUids } = {}) {
  return {
    name: normalizeGroupName(name),
    selectedMemberUids: normalizeSelectedMemberUids(selectedMemberUids),
  };
}

function buildGroupInviteRequest({ conversationId, selectedMemberUids = [], activeMemberUids = [] } = {}) {
  const id = assertConversationId(conversationId);
  const selected = Array.from(new Set(
    selectedMemberUids.filter((uid) => typeof uid === 'string' && uid.trim()).map((uid) => uid.trim()),
  )).sort();

  if (selected.length < 1) throw new Error('Select at least one Friend');
  const activeSet = new Set(activeMemberUids);
  if (selected.some((uid) => activeSet.has(uid))) throw new Error('Selected user is already in the group');
  if (activeMemberUids.length + selected.length > 25) throw new Error('Group member cap reached');

  return { conversationId: id, selectedMemberUids: selected };
}

async function createGroupConversation({ functions, name, selectedMemberUids }, api = defaultFunctionsApi()) {
  const create = api.httpsCallable(functions, 'createGroupConversation');
  const result = await create(buildGroupCreateRequest({ name, selectedMemberUids }));
  return result.data;
}

async function inviteToGroup({ functions, conversationId, selectedMemberUids, activeMemberUids }, api = defaultFunctionsApi()) {
  const invite = api.httpsCallable(functions, 'inviteToGroup');
  const result = await invite(buildGroupInviteRequest({ conversationId, selectedMemberUids, activeMemberUids }));
  return result.data;
}

async function removeGroupMember({ functions, conversationId, memberUid }, api = defaultFunctionsApi()) {
  const remove = api.httpsCallable(functions, 'removeGroupMember');
  const result = await remove({ conversationId: assertConversationId(conversationId), memberUid });
  return result.data;
}

async function leaveGroup({ functions, conversationId, nextAdminUid }, api = defaultFunctionsApi()) {
  const leave = api.httpsCallable(functions, 'leaveGroup');
  const payload = { conversationId: assertConversationId(conversationId) };
  if (nextAdminUid) payload.nextAdminUid = nextAdminUid;
  const result = await leave(payload);
  return result.data;
}

function buildGroupTextMessageWrites({
  conversationId,
  memberUids = [],
  senderUid,
  text,
  messageId,
  createdAt,
}) {
  const normalizedText = normalizeTextMessage(text);
  const lastMessage = {
    id: messageId,
    senderUid,
    type: 'text',
    text: normalizedText,
    createdAt,
  };
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
    message: {
      senderUid,
      type: 'text',
      text: normalizedText,
      createdAt,
      deletedForEveryoneAt: null,
    },
    senderState: { hiddenAt: null, lastSeenAt: createdAt },
    recipientNotifications,
  };
}

async function sendGroupTextMessage({ db, conversation, senderUid, text }, api = defaultFirestoreApi()) {
  const conversationRef = api.doc(db, 'conversations', conversation.id);
  const messageRef = api.doc(api.collection(conversationRef, 'messages'));
  const createdAt = nowValue(api);
  const writes = buildGroupTextMessageWrites({
    conversationId: conversation.id,
    memberUids: conversation.memberUids || [],
    senderUid,
    text,
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

function docData(snapshot) {
  return snapshot && typeof snapshot.exists === 'function' && snapshot.exists()
    ? { id: snapshot.id, ...snapshot.data() }
    : null;
}

function getOtherFriendshipUid(friendship, uid) {
  return (friendship.memberUids || []).find((memberUid) => memberUid !== uid) || null;
}

function getDisplayLabel(user = {}) {
  return user.displayName || user.username || user.uid;
}

function buildGroupInfoViewModel({ viewerUid, adminUid, members = [] } = {}) {
  const isAdminViewer = viewerUid === adminUid;
  const visibleMembers = members.map((member) => {
    const isAdmin = member.uid === adminUid || member.role === 'admin';
    return {
      ...member,
      label: getDisplayLabel(member),
      isAdmin,
      canRemove: isAdminViewer && member.uid !== viewerUid && !isAdmin,
    };
  });

  return {
    members: visibleMembers,
    actions: {
      canAddMembers: isAdminViewer,
      canLeave: Boolean(viewerUid),
      removableMemberUids: visibleMembers.filter((member) => member.canRemove).map((member) => member.uid),
    },
  };
}

function getAddableGroupFriends({ viewerUid, activeMemberUids = [], friends = [], search = '' } = {}) {
  const active = new Set(activeMemberUids);
  const queryText = search.trim().toLowerCase();
  return friends.filter((friend) => {
    if (!friend || !friend.uid || friend.uid === viewerUid || active.has(friend.uid)) return false;
    if (!queryText) return true;
    return `${friend.displayName || ''} ${friend.username || ''} ${friend.uid}`.toLowerCase().includes(queryText);
  });
}

async function loadGroupInfoMembers({ db, conversation }, api = defaultFirestoreApi()) {
  const memberUids = conversation?.memberUids || [];
  return Promise.all(memberUids.map(async (uid) => {
    const [userSnap, memberSnap] = await Promise.all([
      api.getDoc(api.doc(db, 'users', uid)),
      api.getDoc(api.doc(db, 'conversations', conversation.id, 'members', uid)),
    ]);
    return {
      uid,
      ...(docData(userSnap) || {}),
      ...(docData(memberSnap) || {}),
    };
  }));
}

function subscribeGroupCreatableFriends({ db, uid, onChange, onError }, api = defaultFirestoreApi()) {
  const q = api.query(api.collection(db, 'friendships'), api.where('memberUids', 'array-contains', uid));

  return api.onSnapshot(q, async (snapshot) => {
    const friends = (await Promise.all(snapshot.docs.map(async (friendshipDoc) => {
      const friendship = { id: friendshipDoc.id, ...friendshipDoc.data() };
      const friendUid = getOtherFriendshipUid(friendship, uid);
      if (!friendUid) return null;
      const userSnap = await api.getDoc(api.doc(db, 'users', friendUid));
      const user = docData(userSnap) || { uid: friendUid };
      return { ...user, uid: user.uid || friendUid, friendshipId: friendship.id };
    }))).filter(Boolean);

    onChange(friends.sort((a, b) => (
      (a.displayName || a.username || a.uid).localeCompare(b.displayName || b.username || b.uid)
    )));
  }, onError);
}

module.exports = {
  MAX_GROUP_NAME_LENGTH,
  MAX_SELECTED_GROUP_FRIENDS,
  MIN_SELECTED_GROUP_FRIENDS,
  buildGroupCreateRequest,
  buildGroupInfoViewModel,
  buildGroupInviteRequest,
  buildGroupTextMessageWrites,
  createGroupConversation,
  getAddableGroupFriends,
  inviteToGroup,
  leaveGroup,
  loadGroupInfoMembers,
  normalizeGroupName,
  removeGroupMember,
  sendGroupTextMessage,
  subscribeGroupCreatableFriends,
};
module.exports.__esModule = true;
