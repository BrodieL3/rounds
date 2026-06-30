/**
 * One-tap Stop — a lightweight "I was here" check-in (ADR 010 §4).
 *
 * A Stop is DISTINCT from a Rating: it carries no sentiment, notes, media, or
 * visibility, and it never moves ranking strength. It feeds matchmaking priority,
 * the rate-prompt cadence, and visit history. Pure + Firebase-free — the caller
 * supplies createdAt (e.g. serverTimestamp()) and performs the write.
 */

const { getMetroForCity } = require('./constants');

// Un-rated stops at or above this count nudge the user to rate the venue.
const DEFAULT_RATE_PROMPT_THRESHOLD = 3;

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

function buildStopPayload({ userId, venue, city, createdAt } = {}) {
  assert(userId, 'userId is required');
  assert(venue && venue.id, 'a venue with an id is required');
  assert(createdAt !== undefined && createdAt !== null, 'createdAt is required');

  const resolvedCity = city || venue.city || null;

  return {
    userId,
    venueId: venue.id,
    cohort: venue.cohort || null,
    city: resolvedCity,
    metro: resolvedCity ? getMetroForCity(resolvedCity) : null,
    createdAt,
  };
}

function shouldPromptRating({
  stopCount = 0,
  hasRating = false,
  threshold = DEFAULT_RATE_PROMPT_THRESHOLD,
} = {}) {
  if (hasRating) return false;
  return stopCount >= threshold;
}

module.exports = {
  buildStopPayload,
  shouldPromptRating,
  DEFAULT_RATE_PROMPT_THRESHOLD,
};
