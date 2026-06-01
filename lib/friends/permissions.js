const { deriveFriendshipStatus, hasBlock } = require('./request-state');

function isSelf(uidA, uidB) {
  return uidA === uidB;
}

function isBlockedEitherWay(blocks, uidA, uidB) {
  return hasBlock(blocks, uidA, uidB) || hasBlock(blocks, uidB, uidA);
}

function canSendFriendRequest({ viewerUid, otherUid, friendRequests, friendships, blocks } = {}) {
  return (
    deriveFriendshipStatus({ viewerUid, otherUid, friendRequests, friendships, blocks }) === 'none'
  );
}

function canSendDirectMessage({ viewerUid, otherUid, friendships, blocks } = {}) {
  return (
    deriveFriendshipStatus({ viewerUid, otherUid, friendships, blocks }) === 'friends'
  );
}

function canInviteToGroup({ viewerUid, inviteeUid, friendships, blocks } = {}) {
  return canSendDirectMessage({ viewerUid, otherUid: inviteeUid, friendships, blocks });
}

function canTagReviewCompanion({ authorUid, taggedUid, blocks } = {}) {
  if (isSelf(authorUid, taggedUid)) return false;
  return !isBlockedEitherWay(blocks, authorUid, taggedUid);
}

function canCommentOnUserContent({ viewerUid, ownerUid, blocks } = {}) {
  return !isBlockedEitherWay(blocks, viewerUid, ownerUid);
}

module.exports = {
  canCommentOnUserContent,
  canInviteToGroup,
  canSendDirectMessage,
  canSendFriendRequest,
  canTagReviewCompanion,
  isBlockedEitherWay,
};
module.exports.__esModule = true;
