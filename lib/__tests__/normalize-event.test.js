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

  test('preserves RA-style lineup, genres, age, price, and source identity', () => {
    const { payload } = normalizeEventItem({
      raw: {
        id: '2450197',
        title: 'Ellen Allien All Night Long',
        startTime: '2026-07-02T02:30:00.000Z',
        lineup: ['Ellen Allien'],
        genres: [{ name: 'Techno' }, { name: 'Acid' }],
        minAge: 21,
        price: '$25',
        url: 'https://ra.co/events/2450197',
      },
      venue,
      source: 'ra',
    });

    expect(payload.source).toBe('ra');
    expect(payload.sourceEventId).toBe('2450197');
    expect(payload.sourceUrl).toBe('https://ra.co/events/2450197');
    expect(payload.lineup).toEqual(['Ellen Allien']);
    expect(payload.genres).toEqual(['Techno', 'Acid']);
    expect(payload.minAge).toBe(21);
    expect(payload.price).toBe('$25');
  });

  test('accepts Posh/TicketsData-style eventTitle and startDateTime fields', () => {
    const { payload } = normalizeEventItem({
      raw: {
        eventId: 'posh-1',
        eventTitle: 'Warehouse Rave',
        startDateTime: '2026-07-03T03:00:00.000Z',
        endDateTime: '2026-07-03T07:00:00.000Z',
        eventUrl: 'https://posh.vip/e/warehouse-rave',
        lowestPrice: 15,
        isFreeEvent: false,
        organizerName: 'Basement Society',
        lineup: [{ name: 'DJ Test' }],
      },
      venue,
      source: 'posh',
    });

    expect(payload.title).toBe('Warehouse Rave');
    expect(payload.endTime).toBe('2026-07-03T07:00:00.000Z');
    expect(payload.sourceEventId).toBe('posh-1');
    expect(payload.sourceUrl).toBe('https://posh.vip/e/warehouse-rave');
    expect(payload.price).toBe('$15');
    expect(payload.isFree).toBe(false);
    expect(payload.organizerName).toBe('Basement Society');
    expect(payload.lineup).toEqual(['DJ Test']);
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
