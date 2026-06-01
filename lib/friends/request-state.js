function asList(records) {
  if (!records) return [];
  if (Array.isArray(records)) return records;
  if (records.memberUids || records.fromUid || records.blockerUid) return [records];
  return Object.values(records);
}

function hasActiveFriendship(friendship, uidA, uidB) {
  const friendships = asList(friendship);

  return friendships.some((record) => {
    if (!record || record.removedAt || record.deletedAt) return false;
    const memberUids = Array.isArray(record.memberUids) ? record.memberUids : [];
    return memberUids.includes(uidA) && memberUids.includes(uidB);
  });
}

function findPendingRequest(friendRequests, fromUid, toUid) {
  return asList(friendRequests).find(
    (request) =>
      request &&
      request.fromUid === fromUid &&
      request.toUid === toUid &&
      request.status === 'pending',
  );
}

function hasBlock(blocks, blockerUid, blockedUid) {
  return asList(blocks).some(
    (block) =>
      block &&
      !block.revokedAt &&
      block.blockerUid === blockerUid &&
      block.blockedUid === blockedUid,
  );
}

function deriveFriendshipStatus({
  viewerUid,
  otherUid,
  friendship,
  friendships,
  friendRequests,
  blocks,
} = {}) {
  if (viewerUid === otherUid) return 'self';

  if (hasBlock(blocks, viewerUid, otherUid)) return 'blocked_by_me';
  if (hasBlock(blocks, otherUid, viewerUid)) return 'blocked_me';

  const friendshipRecords = friendships || friendship;
  if (hasActiveFriendship(friendshipRecords, viewerUid, otherUid)) return 'friends';

  if (findPendingRequest(friendRequests, otherUid, viewerUid)) return 'incoming_pending';
  if (findPendingRequest(friendRequests, viewerUid, otherUid)) return 'outgoing_pending';

  return 'none';
}

module.exports = {
  deriveFriendshipStatus,
  findPendingRequest,
  hasActiveFriendship,
  hasBlock,
};
module.exports.__esModule = true;
