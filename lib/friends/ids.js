function assertUserId(uid, label) {
  if (typeof uid !== 'string' || uid.trim() === '') {
    throw new TypeError(`${label} must be a non-empty uid`);
  }
}

function assertDifferentUsers(uidA, uidB) {
  if (uidA === uidB) {
    throw new TypeError('ID requires two different users');
  }
}

function getSortedPairUids(uidA, uidB) {
  assertUserId(uidA, 'uidA');
  assertUserId(uidB, 'uidB');
  assertDifferentUsers(uidA, uidB);

  return [uidA, uidB].sort();
}

function buildPairId(uidA, uidB) {
  return getSortedPairUids(uidA, uidB).join('_');
}

function buildFriendshipId(uidA, uidB) {
  return buildPairId(uidA, uidB);
}

function buildDirectConversationId(uidA, uidB) {
  return `dm_${buildPairId(uidA, uidB)}`;
}

function buildDirectionalPairId(fromUid, toUid, fromLabel = 'fromUid', toLabel = 'toUid') {
  assertUserId(fromUid, fromLabel);
  assertUserId(toUid, toLabel);
  assertDifferentUsers(fromUid, toUid);

  return `${fromUid}_${toUid}`;
}

function buildFriendRequestId(fromUid, toUid) {
  return buildDirectionalPairId(fromUid, toUid, 'fromUid', 'toUid');
}

function buildBlockId(blockerUid, blockedUid) {
  return buildDirectionalPairId(blockerUid, blockedUid, 'blockerUid', 'blockedUid');
}

module.exports = {
  buildBlockId,
  buildDirectConversationId,
  buildFriendRequestId,
  buildFriendshipId,
  getSortedPairUids,
};
module.exports.__esModule = true;
