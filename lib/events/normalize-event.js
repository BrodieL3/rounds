// Pure. Maps a raw scraped/source item to the canonical event shape, computing
// the SAME deterministic id the seed would — that's what makes scrape-vs-seed
// dedup work. Used by the P4 ingestion Function. Firebase-free.

const { buildEventId } = require('./event-id');
const { buildEventPayload, VALID_CATEGORIES } = require('./event-payload');
const { localDateOf } = require('./event-date');

function inferCategory(title = '') {
  if (/\bdj\b|dj set|resident dj/i.test(title)) return 'dj_set';
  if (/live music|live band|\bband\b|acoustic|\bjazz\b/i.test(title)) return 'live_music';
  if (/open mic|mic night/i.test(title)) return 'open_mic';
  return 'one_time_promo';
}

function firstPresent(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '');
}

function stringValue(value) {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function namedList(values) {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => {
      if (typeof value === 'string') return value.trim();
      return stringValue(value?.name || value?.title || value?.displayName);
    })
    .filter(Boolean);
}

function normalizePrice(raw = {}) {
  if (raw.isFreeEvent === true || raw.isFree === true) return 'Free';
  const price = stringValue(raw.price);
  if (price) return price;
  const lowest = raw.lowestPrice ?? raw.minPrice;
  if (typeof lowest === 'number' && Number.isFinite(lowest)) return `$${lowest}`;
  return null;
}

function normalizeEventItem({ raw = {}, venue, source = 'venue-site' } = {}) {
  const title = stringValue(firstPresent(raw.title, raw.name, raw.eventTitle, raw.event_title));
  if (!title) throw new Error('raw item has no title/name');

  const startDate = new Date(firstPresent(
    raw.start,
    raw.startTime,
    raw.start_time,
    raw.datetime,
    raw.startDateTime,
    raw.start_date_time,
    raw.date
  ));
  if (Number.isNaN(startDate.getTime())) throw new Error('raw item has no valid start time');
  const localDate = localDateOf(startDate);

  const endRaw = firstPresent(raw.end, raw.endTime, raw.end_time, raw.endDateTime, raw.end_date_time);
  const endDate = endRaw ? new Date(endRaw) : null;
  const genres = namedList(raw.genres);
  const category = VALID_CATEGORIES.includes(raw.category)
    ? raw.category
    : inferCategory(`${title} ${genres.join(' ')}`);

  const payload = buildEventPayload({
    venue,
    title,
    category,
    startTime: startDate.toISOString(),
    endTime: endDate && !Number.isNaN(endDate.getTime()) ? endDate.toISOString() : null,
    localDate,
    source,
    sourceUrl: firstPresent(raw.url, raw.sourceUrl, raw.eventUrl, raw.eventURL, raw.link) || null,
    sourceEventId: stringValue(firstPresent(raw.id, raw.eventId, raw.event_id)) || null,
    lineup: namedList(raw.lineup),
    genres,
    price: normalizePrice(raw),
    minAge: raw.minAge ?? raw.ageLimit ?? null,
    isFree: raw.isFreeEvent ?? raw.isFree ?? null,
    organizerName: stringValue(firstPresent(raw.organizerName, raw.organizer?.name)) || null,
  });
  const id = buildEventId({ venueId: venue.id, localDate, title });
  return { id, payload };
}

module.exports = { normalizeEventItem, inferCategory };
