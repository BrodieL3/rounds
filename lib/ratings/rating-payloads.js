const VALID_SENTIMENTS = Object.freeze(['loved', 'fine', 'disliked']);
const VALID_VISIBILITIES = Object.freeze(['public', 'unlisted', 'private']);

function assertRequired(value, message) {
  if (value === undefined || value === null || value === '') throw new Error(message);
}

function assertValidSentiment(sentiment) {
  if (!VALID_SENTIMENTS.includes(sentiment)) throw new Error('A valid sentiment is required');
}

function assertValidVisibility(visibility) {
  if (!VALID_VISIBILITIES.includes(visibility)) throw new Error('A valid visibility is required');
}

function normalizeNotes(notes) {
  return typeof notes === 'string' ? notes.trim() : '';
}

function normalizeMediaPaths(mediaPaths) {
  if (!mediaPaths) return [];
  if (!Array.isArray(mediaPaths)) throw new Error('mediaPaths must be an array');
  return mediaPaths.filter((path) => typeof path === 'string' && path.length > 0);
}

function buildRatingPayload({
  user,
  profile = {},
  venue,
  sentiment,
  notes = '',
  mediaPaths = [],
  visibility = 'public',
  createdAt,
} = {}) {
  assertRequired(user?.uid, 'user.uid is required');
  assertRequired(venue?.id, 'venue.id is required');
  assertRequired(venue?.name, 'venue.name is required');
  assertRequired(venue?.cohort, 'venue.cohort is required');
  assertValidSentiment(sentiment);
  assertValidVisibility(visibility);

  return {
    userId: user.uid,
    username: profile?.username || 'user',
    displayName: profile?.displayName || 'User',
    userPhotoURL: profile?.photoURL || profile?.userPhotoURL || null,
    venueId: venue.id,
    venueName: venue.name,
    cohort: venue.cohort,
    sentiment,
    notes: normalizeNotes(notes),
    mediaPaths: normalizeMediaPaths(mediaPaths),
    city: profile?.city || 'nyc',
    visibility,
    createdAt,
  };
}

function shouldCreatePostProjection(rating) {
  return rating?.visibility === 'public';
}

function buildPostProjection({ ratingId, rating } = {}) {
  assertRequired(ratingId, 'ratingId is required');
  if (!rating) throw new Error('rating is required');
  if (!shouldCreatePostProjection(rating)) return null;

  return {
    ratingId,
    userId: rating.userId,
    username: rating.username,
    displayName: rating.displayName,
    userPhotoURL: rating.userPhotoURL || null,
    venueId: rating.venueId,
    venueName: rating.venueName,
    cohort: rating.cohort,
    sentiment: rating.sentiment,
    notes: rating.notes || '',
    mediaPaths: normalizeMediaPaths(rating.mediaPaths),
    city: rating.city,
    visibility: 'public',
    likes: 0,
    likedBy: [],
    bookmarks: 0,
    bookmarkedBy: [],
    createdAt: rating.createdAt,
  };
}

function buildRatingCreation({ ratingId, ...input } = {}) {
  assertRequired(ratingId, 'ratingId is required');
  const rating = buildRatingPayload(input);
  const post = buildPostProjection({ ratingId, rating });
  return { rating, post };
}

module.exports = {
  VALID_SENTIMENTS,
  VALID_VISIBILITIES,
  buildPostProjection,
  buildRatingCreation,
  buildRatingPayload,
  normalizeMediaPaths,
  normalizeNotes,
  shouldCreatePostProjection,
};
