function requiredString(value, fieldName) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) throw new Error(`${fieldName} is required`);
  return normalized;
}

function validateShareRequest({ ratingId, conversationId }) {
  requiredString(ratingId, 'ratingId');
  requiredString(conversationId, 'conversationId');
}

function buildShareGrants({ ratingId, conversationId, sharedByUid, activeMemberUids, createdAt }) {
  const ratingShare = {
    conversationId,
    sharedByUid,
    createdAt,
    revokedAt: null,
  };

  const memberShares = activeMemberUids.reduce((acc, uid) => {
    acc[uid] = {
      ratingId,
      conversationId,
      grantedAt: createdAt,
      revokedAt: null,
    };
    return acc;
  }, {});

  return { ratingShare, memberShares };
}

module.exports = {
  validateShareRequest,
  buildShareGrants,
};
