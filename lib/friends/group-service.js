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

function buildGroupCreateRequest({ name, selectedMemberUids } = {}) {
  return {
    name: normalizeGroupName(name),
    selectedMemberUids: normalizeSelectedMemberUids(selectedMemberUids),
  };
}

async function createGroupConversation({ functions, name, selectedMemberUids }, api = defaultFunctionsApi()) {
  const create = api.httpsCallable(functions, 'createGroupConversation');
  const result = await create(buildGroupCreateRequest({ name, selectedMemberUids }));
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
  buildGroupTextMessageWrites,
  createGroupConversation,
  normalizeGroupName,
  sendGroupTextMessage,
  subscribeGroupCreatableFriends,
};
module.exports.__esModule = true;
