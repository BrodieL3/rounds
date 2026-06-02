const { validateShareRequest, buildShareGrants } = require('../lib/unlisted-share-service');

async function sharePrivateRatingCallable(request, deps) {
  const { db, ErrorClass, now } = deps;
  const callerUid = request.auth?.uid;

  if (!callerUid) {
    throw new ErrorClass('unauthenticated', 'Sign in to share reviews.');
  }

  const { ratingId, conversationId } = request.data || {};

  try {
    validateShareRequest({ ratingId, conversationId });
  } catch (err) {
    throw new ErrorClass('invalid-argument', err.message);
  }

  // Verify rating exists and caller is owner
  const ratingRef = db.collection('ratings').doc(ratingId);
  const ratingSnap = await ratingRef.get();
  if (!ratingSnap.exists) {
    throw new ErrorClass('not-found', 'Rating not found.');
  }
  const ratingData = ratingSnap.data();
  if (ratingData.userId !== callerUid) {
    throw new ErrorClass('permission-denied', 'Only the rating owner can share it.');
  }
  if (ratingData.visibility === 'public') {
    throw new ErrorClass('failed-precondition', 'Public ratings do not need unlisted shares.');
  }

  // Verify conversation exists
  const conversationRef = db.collection('conversations').doc(conversationId);
  const conversationSnap = await conversationRef.get();
  if (!conversationSnap.exists) {
    throw new ErrorClass('not-found', 'Conversation not found.');
  }
  const conversationData = conversationSnap.data();

  // Verify caller is active member
  const callerMemberRef = conversationRef.collection('members').doc(callerUid);
  const callerMemberSnap = await callerMemberRef.get();
  if (!callerMemberSnap.exists || callerMemberSnap.data().leftAt != null) {
    throw new ErrorClass('permission-denied', 'You must be an active member of this conversation.');
  }

  // Get active members
  const membersSnap = await conversationRef.collection('members').where('leftAt', '==', null).get();
  const activeMemberUids = membersSnap.docs.map((d) => d.id);

  if (activeMemberUids.length === 0) {
    throw new ErrorClass('failed-precondition', 'No active members in this conversation.');
  }

  // Check for existing active share
  const existingShareRef = ratingRef.collection('shares').doc(conversationId);
  const existingShareSnap = await existingShareRef.get();
  if (existingShareSnap.exists && existingShareSnap.data().revokedAt == null) {
    throw new ErrorClass('already-exists', 'This rating is already shared in this conversation.');
  }

  const createdAt = now();
  const grants = buildShareGrants({
    ratingId,
    conversationId,
    sharedByUid: callerUid,
    activeMemberUids,
    createdAt,
  });

  const batch = db.batch();

  // Write rating share doc
  batch.set(existingShareRef, grants.ratingShare);

  // Write member share docs
  activeMemberUids.forEach((uid) => {
    const memberShareRef = db.collection('users').doc(uid).collection('sharedRatings').doc(ratingId);
    batch.set(memberShareRef, grants.memberShares[uid]);
  });

  await batch.commit();

  return { success: true, sharedMemberCount: activeMemberUids.length };
}

module.exports = {
  sharePrivateRatingCallable,
};
