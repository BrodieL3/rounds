const { CITIES } = require('./constants');

const COHORT_LABELS = {
  cocktail_bar: 'Cocktail Lounge',
  wine_bar: 'Wine Bar',
  sports_bar: 'Sports Bar',
  pub: 'Pub',
  night_club: 'Nightclub',
  dive_bar: 'Dive Bar',
};

const COHORT_ICONS = {
  cocktail_bar: '🍸',
  wine_bar: '🍷',
  sports_bar: '🏟️',
  pub: '🍺',
  night_club: '🪩',
  dive_bar: '🍻',
};

function formatElapsedTime(date, now = new Date()) {
  if (!date) return 'now';

  const value = date?.toDate?.() || date;
  const seconds = Math.floor((new Date(now) - new Date(value)) / 1000);
  if (!Number.isFinite(seconds) || seconds < 60) return 'now';

  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getFeedActor(post) {
  return post.displayName || (post.username ? `@${post.username}` : null) || 'Someone';
}

function getFeedVerb(post) {
  const type = post.activityType || post.type || post.action;
  if (type === 'bookmark' || type === 'bookmarked' || post.bookmarkedOnly) return 'bookmarked';
  if (type === 'save' || type === 'saved') return 'saved';
  return 'ranked';
}

function getVenueName(post) {
  return post.venueName || post.venue?.name || 'a venue';
}

// Location is the VENUE's, carried on the post as `post.city` (see ADR 007). The
// viewer's own city is NEVER used to label someone else's review — that was the
// bug that tagged Boston bars "New York". Prefer a precise neighborhood, then the
// post's own city; combine them ("Back Bay, Boston") when both are known.
function getFeedArea(post) {
  const neighborhood = post.neighborhood
    || post.venueNeighborhood
    || post.area
    || post.district
    || post.venue?.neighborhood
    || null;
  const cityLabel = CITIES[post.city] || null;
  if (neighborhood && cityLabel) return `${neighborhood}, ${cityLabel}`;
  return neighborhood || cityLabel || null;
}

function getRatingBadge(post) {
  const value = post.numericRating ?? post.rating ?? post.score ?? post.personalScore;
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function getBookmarkCount(post) {
  if (typeof post.bookmarks === 'number') return post.bookmarks;
  if (typeof post.bookmarkCount === 'number') return post.bookmarkCount;
  if (Array.isArray(post.savedBy)) return post.savedBy.length;
  if (Array.isArray(post.bookmarkedBy)) return post.bookmarkedBy.length;
  return 0;
}

function pluralize(count, label) {
  return `${count} ${label}${count === 1 ? '' : 's'}`;
}

// `cityKey` is retained in the signature for call-site compatibility but is no
// longer used for the area label — location now comes from the post (ADR 007).
function buildFeedItemDisplay(post, cityKey, now = new Date()) {
  const cohortLabel = COHORT_LABELS[post.cohort] || post.subcategory || 'Nightlife';
  const icon = post.icon || COHORT_ICONS[post.cohort] || '📍';
  const area = getFeedArea(post);
  const time = post.timeAgo || formatElapsedTime(post.createdAt, now);
  const metadata = [`${icon} ${cohortLabel}`, area, time].filter(Boolean).join(' · ');
  const likes = typeof post.likes === 'number' ? post.likes : Array.isArray(post.likedBy) ? post.likedBy.length : 0;
  const bookmarks = getBookmarkCount(post);

  return {
    activity: {
      actor: getFeedActor(post),
      verb: getFeedVerb(post),
      venue: getVenueName(post),
    },
    metadata,
    ratingBadge: getRatingBadge(post),
    notes: post.notes?.trim?.() || post.description?.trim?.() || '',
    engagement: {
      likes: pluralize(likes, 'like'),
      bookmarks: pluralize(bookmarks, 'saved review'),
    },
  };
}

module.exports = {
  buildFeedItemDisplay,
  formatElapsedTime,
};
