const { normalizeEventItem, inferCategory } = require('../events/normalize-event');
const { buildEventId } = require('../events/event-id');
const { localDateOf } = require('../events/event-date');

const venue = { id: 'ovt:abc', name: 'The Sevens', cohort: 'pub', city: 'boston', latitude: 42.357, longitude: -71.07 };
const raw = { name: 'Trivia Night', start: '2026-07-01T23:00:00.000Z', url: 'https://x/y' };

describe('normalizeEventItem', () => {
  test('maps a raw source item to a valid {id, payload} with the venue block', () => {
    const { id, payload } = normalizeEventItem({ raw, venue, source: 'eventbrite' });
    expect(payload.venueId).toBe('ovt:abc');
    expect(payload.metro).toBe('boston');
    expect(payload.title).toBe('Trivia Night');
    expect(payload.source).toBe('eventbrite');
    expect(payload.sourceUrl).toBe('https://x/y');
    expect(id).toMatch(/^[0-9a-f]{20}$/);
  });

  test('CONTRACT: id equals what the seed would produce for the same occurrence', () => {
    const { id } = normalizeEventItem({ raw, venue });
    const seedId = buildEventId({ venueId: venue.id, localDate: localDateOf(new Date(raw.start)), title: 'Trivia Night' });
    expect(id).toBe(seedId);
  });

  test('CONTRACT: title formatting drift in the source still dedups to the same id', () => {
    const a = normalizeEventItem({ raw, venue }).id;
    const b = normalizeEventItem({ raw: { ...raw, name: '  trivia   NIGHT! ' }, venue }).id;
    expect(a).toBe(b);
  });

  test('infers category from the title', () => {
    expect(inferCategory('Resident DJ Set')).toBe('dj_set');
    expect(inferCategory('Live Music: Jazz Trio')).toBe('live_music');
    expect(inferCategory('Open Mic Night')).toBe('open_mic');
    expect(inferCategory('$2 Taco Tuesday')).toBe('one_time_promo');
  });

  test('throws on a missing title or invalid start', () => {
    expect(() => normalizeEventItem({ raw: { start: raw.start }, venue })).toThrow(/title/);
    expect(() => normalizeEventItem({ raw: { name: 'X', start: 'nope' }, venue })).toThrow(/start/);
  });
});
