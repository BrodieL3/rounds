// Pure builders for the two server-owned collections. They validate input and
// emit the denormalized venue block every consumer reads (ADR 007: city carries
// the metro lens). Mirrors lib/ratings/rating-payloads. Firebase-free.

const { getMetroForCity } = require('../constants');
const { getVenueCoordinates } = require('../venue-coordinates');

const VALID_CATEGORIES = Object.freeze(['live_music', 'dj_set', 'open_mic', 'one_time_promo']);

function assertRequired(value, message) {
  if (value === undefined || value === null || value === '') throw new Error(message);
}

function venueBlock(venue = {}) {
  assertRequired(venue.id, 'venue.id is required');
  assertRequired(venue.name, 'venue.name is required');
  assertRequired(venue.cohort, 'venue.cohort is required');
  const city = venue.city || null;
  const coordinates = getVenueCoordinates(venue);
  return {
    venueId: venue.id,
    venueName: venue.name,
    cohort: venue.cohort,
    city,
    metro: getMetroForCity(city),
    lat: coordinates?.latitude ?? null,
    lng: coordinates?.longitude ?? null,
  };
}

function buildEventPayload({
  venue,
  title,
  category,
  startTime,
  endTime = null,
  localDate,
  source = 'manual-seed',
  sourceUrl = null,
  sourceEventId = null,
  lineup = [],
  genres = [],
  price = null,
  minAge = null,
  isFree = null,
  organizerName = null,
} = {}) {
  assertRequired(title, 'title is required');
  if (!VALID_CATEGORIES.includes(category)) throw new Error('A valid event category is required');
  assertRequired(startTime, 'startTime is required');
  assertRequired(localDate, 'localDate is required');
  return {
    ...venueBlock(venue),
    title,
    category,
    startTime,
    endTime,
    localDate,
    source,
    sourceUrl,
    sourceEventId,
    lineup,
    genres,
    price,
    minAge,
    isFree,
    organizerName,
    lastVerified: new Date().toISOString(),
  };
}

function buildHappyHourPayload({
  venue,
  dayOfWeek,
  startLocal,
  endLocal,
  dealSummary,
  drinkPrices = null,
  isActive = true,
} = {}) {
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    throw new Error('dayOfWeek must be an integer 0..6');
  }
  assertRequired(startLocal, 'startLocal is required');
  assertRequired(endLocal, 'endLocal is required');
  assertRequired(dealSummary, 'dealSummary is required');
  return {
    ...venueBlock(venue),
    dayOfWeek,
    startLocal,
    endLocal,
    dealSummary,
    drinkPrices,
    isActive,
  };
}

module.exports = { buildEventPayload, buildHappyHourPayload, VALID_CATEGORIES };
