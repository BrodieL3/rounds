// Pure. Maps a raw scraped/source item to the canonical event shape, computing
// the SAME deterministic id the seed would — that's what makes scrape-vs-seed
// dedup work. Used by the P4 ingestion Function. Firebase-free.

const { buildEventId } = require('./event-id');
const { buildEventPayload } = require('./event-payload');
const { localDateOf } = require('./event-date');

function inferCategory(title = '') {
  if (/\bdj\b|dj set|resident dj/i.test(title)) return 'dj_set';
  if (/live music|live band|\bband\b|acoustic|\bjazz\b/i.test(title)) return 'live_music';
  if (/open mic|mic night/i.test(title)) return 'open_mic';
  return 'one_time_promo';
}

function normalizeEventItem({ raw = {}, venue, source = 'venue-site' } = {}) {
  const title = String(raw.title || raw.name || '').trim();
  if (!title) throw new Error('raw item has no title/name');

  const startDate = new Date(raw.start || raw.startTime || raw.start_time || raw.datetime);
  if (Number.isNaN(startDate.getTime())) throw new Error('raw item has no valid start time');
  const localDate = localDateOf(startDate);

  const endRaw = raw.end || raw.endTime || raw.end_time;
  const endDate = endRaw ? new Date(endRaw) : null;

  const payload = buildEventPayload({
    venue,
    title,
    category: inferCategory(title),
    startTime: startDate.toISOString(),
    endTime: endDate && !Number.isNaN(endDate.getTime()) ? endDate.toISOString() : null,
    localDate,
    source,
    sourceUrl: raw.url || raw.sourceUrl || null,
  });
  const id = buildEventId({ venueId: venue.id, localDate, title });
  return { id, payload };
}

module.exports = { normalizeEventItem, inferCategory };
