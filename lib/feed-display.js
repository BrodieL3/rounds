const COHORT_LABELS = {
  cocktail_bar: 'Cocktail Lounge',
  wine_bar: 'Wine Bar',
  sports_bar: 'Sports Bar',
  pub: 'Pub',
  night_club: 'Nightclub',
  dive_bar: 'Dive Bar',
};

const CITIES = {
  nyc: 'New York',
  boston: 'Boston',
  chicago: 'Chicago',
  sf: 'San Francisco',
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

function getFeedArea(post, cityKey) {
  return post.neighborhood
    || post.venueNeighborhood
    || post.area
    || post.district
    || post.venue?.neighborhood
    || CITIES[cityKey]
    || cityKey?.toUpperCase?.()
    || null;
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

function buildFeedItemDisplay(post, cityKey, now = new Date()) {
  const cohortLabel = COHORT_LABELS[post.cohort] || post.subcategory || 'Nightlife';
  const icon = post.icon || COHORT_ICONS[post.cohort] || '📍';
  const area = getFeedArea(post, cityKey);
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
