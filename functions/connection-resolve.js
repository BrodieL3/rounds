const { buildFriendRequestId } = require('./ids');

class ConnectionResolveError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function makeError(ErrorClass, code, message) {
  return new ErrorClass(code, message);
}

// Pure: validate a scanned token against the scanner + wall clock, and return the
// friend request to create. createdAt is stamped by the callable at write time.
// Throws a callable error code on any failure. (Logic mirrors lib/proximity/
// connection-token; duplicated here because functions deploy from their own dir.)
function buildConnectionResolveDocuments({ token, tokenData, scannerUid, nowISO, ErrorClass = ConnectionResolveError }) {
  if (!scannerUid) throw makeError(ErrorClass, 'unauthenticated', 'Sign in to connect');
  if (!token || typeof token !== 'string') throw makeError(ErrorClass, 'invalid-argument', 'A connection token is required');
  if (!tokenData) throw makeError(ErrorClass, 'not-found', 'This code is invalid or has expired');
  if (tokenData.consumed) throw makeError(ErrorClass, 'failed-precondition', 'This code has already been used');
  if (!tokenData.expiresAt || nowISO > tokenData.expiresAt) {
    throw makeError(ErrorClass, 'deadline-exceeded', 'This code has expired');
  }
  const toUid = tokenData.uid;
  if (!toUid) throw makeError(ErrorClass, 'not-found', 'This code is invalid');
  if (toUid === scannerUid) throw makeError(ErrorClass, 'invalid-argument', "You can't connect to yourself");

  return {
    token,
    requestId: buildFriendRequestId(scannerUid, toUid),
    friendRequest: { fromUid: scannerUid, toUid, status: 'pending' },
  };
}

async function resolveConnectionTokenCallable(request, deps = {}) {
  const ErrorClass = deps.ErrorClass || ConnectionResolveError;
  const { db, now } = deps;
  const scannerUid = request.auth && request.auth.uid;
  if (!scannerUid) throw makeError(ErrorClass, 'unauthenticated', 'Sign in to connect');
  if (!db) throw makeError(ErrorClass, 'internal', 'Firestore is not configured');
  const token = request.data && request.data.token;
  if (!token || typeof token !== 'string') throw makeError(ErrorClass, 'invalid-argument', 'A connection token is required');

  const snap = await db.collection('connectionTokens').doc(token).get();
  const tokenData = snap.exists ? snap.data() : undefined;

  const plan = buildConnectionResolveDocuments({
    token,
    tokenData,
    scannerUid,
    nowISO: new Date().toISOString(),
    ErrorClass,
  });

  // Single-use: mark the token consumed and create the friend request together.
  const batch = db.batch();
  batch.set(db.collection('connectionTokens').doc(token), { consumed: true }, { merge: true });
  batch.set(db.collection('friendRequests').doc(plan.requestId), {
    ...plan.friendRequest,
    createdAt: now ? now() : null,
  });
  await batch.commit();

  return { ok: true, requestId: plan.requestId, toUid: plan.friendRequest.toUid };
}

module.exports = { ConnectionResolveError, buildConnectionResolveDocuments, resolveConnectionTokenCallable };
