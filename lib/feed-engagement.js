function uniqueStrings(values) {
  if (!Array.isArray(values)) return [];
  const seen = new Set();
  return values.filter((value) => {
    if (typeof value !== 'string' || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function requireUid(uid) {
  if (typeof uid !== 'string' || !uid.trim()) {
    throw new Error('uid is required');
  }
  return uid.trim();
}

function toggleUid(values, uid) {
  const normalizedUid = requireUid(uid);
  const current = uniqueStrings(values);
  if (current.includes(normalizedUid)) {
    return current.filter((value) => value !== normalizedUid);
  }
  return [...current, normalizedUid];
}

function buildPostLikeUpdate(post, uid) {
  const likedBy = toggleUid(post?.likedBy, uid);
  return {
    likedBy,
    likes: likedBy.length,
  };
}

function buildPostBookmarkUpdate(post, uid) {
  const bookmarkedBy = toggleUid(post?.bookmarkedBy, uid);
  return {
    bookmarkedBy,
    bookmarks: bookmarkedBy.length,
  };
}

function isPostLikedBy(post, uid) {
  return uniqueStrings(post?.likedBy).includes(uid);
}

function isPostBookmarkedBy(post, uid) {
  return uniqueStrings(post?.bookmarkedBy).includes(uid);
}

function firstString(...values) {
  const value = values.find((candidate) => typeof candidate === 'string' && candidate.trim());
  return value ? value.trim() : '';
}

function buildReviewShareParams(post = {}) {
  return {
    ratingId: firstString(post.ratingId, post.id),
    venueId: firstString(post.venueId),
    venueName: firstString(post.venueName, post.venue?.name),
    venueCohort: firstString(post.cohort, post.venueCohort),
    sentiment: firstString(post.sentiment),
    authorDisplayName: firstString(post.displayName, post.authorDisplayName),
    authorUsername: firstString(post.username, post.authorUsername),
    notes: firstString(post.notes, post.description),
    visibility: firstString(post.visibility) || 'public',
  };
}

module.exports = {
  buildPostBookmarkUpdate,
  buildPostLikeUpdate,
  buildReviewShareParams,
  isPostBookmarkedBy,
  isPostLikedBy,
  uniqueStrings,
};
