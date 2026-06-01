const { deriveFriendshipStatus } = require('./request-state');
const { buildFriendRequestId, buildFriendshipId, getSortedPairUids } = require('./ids');

function defaultApi() {
  return require('firebase/firestore');
}

function nowValue(api) {
  return api && typeof api.serverTimestamp === 'function' ? api.serverTimestamp() : new Date();
}

function buildPendingFriendRequest({ fromUid, toUid, createdAt }) {
  return {
    id: buildFriendRequestId(fromUid, toUid),
    data: {
      fromUid,
      toUid,
      status: 'pending',
      createdAt,
    },
  };
}

function buildFriendRequestNotification({ type, actorUid, createdAt }) {
  return { type, actorUid, createdAt };
}

function buildAcceptedFriendshipWrites({ fromUid, toUid, respondedAt }) {
  const requestId = buildFriendRequestId(fromUid, toUid);
  const friendshipId = buildFriendshipId(fromUid, toUid);
  const memberUids = getSortedPairUids(fromUid, toUid);

  return {
    requestId,
    friendshipId,
    requestUpdate: { status: 'accepted', respondedAt },
    friendship: {
      memberUids,
      createdAt: respondedAt,
      createdFromRequestId: requestId,
    },
    followUpdates: {
      [fromUid]: { followersAdd: toUid, followingAdd: toUid },
      [toUid]: { followersAdd: fromUid, followingAdd: fromUid },
    },
    notification: buildFriendRequestNotification({
      type: 'friend_request_accepted',
      actorUid: toUid,
      createdAt: respondedAt,
    }),
  };
}

function getFriendshipCta(status) {
  switch (status) {
    case 'none':
      return { label: 'Add Friend', action: 'send_request', disabled: false };
    case 'outgoing_pending':
      return { label: 'Requested', action: 'cancel_request', disabled: false };
    case 'incoming_pending':
      return { label: 'Respond', action: 'respond_request', disabled: false };
    case 'friends':
      return { label: 'Friends', action: 'none', disabled: true, showMessage: true };
    case 'blocked_by_me':
    case 'blocked_me':
      return { label: 'Unavailable', action: 'none', disabled: true };
    case 'self':
    default:
      return { label: '', action: 'none', disabled: true };
  }
}

async function sendFriendRequest({ db, fromUid, toUid }, api = defaultApi()) {
  const createdAt = nowValue(api);
  const request = buildPendingFriendRequest({ fromUid, toUid, createdAt });
  const notification = buildFriendRequestNotification({
    type: 'friend_request_received',
    actorUid: fromUid,
    createdAt,
  });

  const batch = api.writeBatch(db);
  batch.set(api.doc(db, 'friendRequests', request.id), request.data);
  batch.set(api.doc(db, 'users', toUid, 'notifications', `${request.id}_received`), notification);
  await batch.commit();

  return request;
}

async function cancelFriendRequest({ db, fromUid, toUid }, api = defaultApi()) {
  const requestId = buildFriendRequestId(fromUid, toUid);
  await api.updateDoc(api.doc(db, 'friendRequests', requestId), {
    status: 'canceled',
    respondedAt: nowValue(api),
  });
}

async function declineFriendRequest({ db, fromUid, toUid }, api = defaultApi()) {
  const requestId = buildFriendRequestId(fromUid, toUid);
  await api.updateDoc(api.doc(db, 'friendRequests', requestId), {
    status: 'declined',
    respondedAt: nowValue(api),
  });
}

async function acceptFriendRequest({ db, fromUid, toUid }, api = defaultApi()) {
  const respondedAt = nowValue(api);
  const writes = buildAcceptedFriendshipWrites({ fromUid, toUid, respondedAt });
  const batch = api.writeBatch(db);

  batch.update(api.doc(db, 'friendRequests', writes.requestId), writes.requestUpdate);
  batch.set(api.doc(db, 'friendships', writes.friendshipId), writes.friendship);
  batch.update(api.doc(db, 'users', fromUid), {
    followers: api.arrayUnion(toUid),
    following: api.arrayUnion(toUid),
  });
  batch.update(api.doc(db, 'users', toUid), {
    followers: api.arrayUnion(fromUid),
    following: api.arrayUnion(fromUid),
  });
  batch.set(api.doc(db, 'users', fromUid, 'notifications', `${writes.requestId}_accepted`), writes.notification);

  await batch.commit();
  return writes;
}

function docData(snapshot) {
  return snapshot && typeof snapshot.exists === 'function' && snapshot.exists()
    ? { id: snapshot.id, ...snapshot.data() }
    : null;
}

async function loadFriendshipStatus({ db, viewerUid, otherUid }, api = defaultApi()) {
  if (!viewerUid || !otherUid) return 'none';
  if (viewerUid === otherUid) return 'self';

  const outgoingId = buildFriendRequestId(viewerUid, otherUid);
  const incomingId = buildFriendRequestId(otherUid, viewerUid);
  const friendshipId = buildFriendshipId(viewerUid, otherUid);

  const [outgoingSnap, incomingSnap, friendshipSnap] = await Promise.all([
    api.getDoc(api.doc(db, 'friendRequests', outgoingId)),
    api.getDoc(api.doc(db, 'friendRequests', incomingId)),
    api.getDoc(api.doc(db, 'friendships', friendshipId)),
  ]);

  return deriveFriendshipStatus({
    viewerUid,
    otherUid,
    friendRequests: [docData(outgoingSnap), docData(incomingSnap)].filter(Boolean),
    friendships: [docData(friendshipSnap)].filter(Boolean),
  });
}

function subscribeIncomingFriendRequests({ db, uid, onChange, onError }, api = defaultApi()) {
  const q = api.query(
    api.collection(db, 'friendRequests'),
    api.where('toUid', '==', uid),
    api.where('status', '==', 'pending'),
  );

  return api.onSnapshot(q, async (snapshot) => {
    const requests = await Promise.all(snapshot.docs.map(async (requestDoc) => {
      const request = { id: requestDoc.id, ...requestDoc.data() };
      const fromSnap = await api.getDoc(api.doc(db, 'users', request.fromUid));
      return {
        ...request,
        fromUser: docData(fromSnap),
      };
    }));
    onChange(requests);
  }, onError);
}

module.exports = {
  acceptFriendRequest,
  buildAcceptedFriendshipWrites,
  buildFriendRequestNotification,
  buildPendingFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  getFriendshipCta,
  loadFriendshipStatus,
  sendFriendRequest,
  subscribeIncomingFriendRequests,
};
module.exports.__esModule = true;
