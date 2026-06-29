// Pure. RSVP ("interested") on an event-post — the event-engagement primitive,
// distinct from a Post like. Operates on the interested-uids list. Firebase-free.

function toggleRsvp(interestedUids = [], uid) {
  if (!uid) throw new Error('uid is required');
  return interestedUids.includes(uid)
    ? interestedUids.filter((u) => u !== uid)
    : [...interestedUids, uid];
}

function isInterested(interestedUids = [], uid) {
  return interestedUids.includes(uid);
}

function rsvpCount(interestedUids = []) {
  return interestedUids.length;
}

module.exports = { toggleRsvp, isInterested, rsvpCount };
