const { getMetroForCity } = require('../constants');
const { buildEventPayload, buildHappyHourPayload } = require('../events/event-payload');

const venue = {
  id: 'ovt:abc',
  name: 'The Sevens',
  cohort: 'pub',
  city: 'boston',
  latitude: 42.357,
  longitude: -71.07,
};

describe('buildEventPayload', () => {
  const base = {
    venue,
    title: 'Trivia Night',
    category: 'open_mic',
    startTime: '2026-07-01T23:00:00.000Z',
    localDate: '2026-07-01',
  };

  test('denormalizes the venue block and derives metro from city', () => {
    const p = buildEventPayload(base);
    expect(p.venueId).toBe('ovt:abc');
    expect(p.venueName).toBe('The Sevens');
    expect(p.cohort).toBe('pub');
    expect(p.city).toBe('boston');
    expect(p.metro).toBe(getMetroForCity('boston'));
    expect(p.lat).toBe(42.357);
    expect(p.lng).toBe(-71.07);
  });

  test('carries event fields and defaults source/endTime/sourceUrl', () => {
    const p = buildEventPayload(base);
    expect(p.title).toBe('Trivia Night');
    expect(p.category).toBe('open_mic');
    expect(p.localDate).toBe('2026-07-01');
    expect(p.source).toBe('manual-seed');
    expect(p.endTime).toBeNull();
    expect(p.sourceUrl).toBeNull();
    expect(p.lastVerified).toBeDefined();
  });

  test('rejects an unknown category', () => {
    expect(() => buildEventPayload({ ...base, category: 'live_music' })).not.toThrow();
    expect(() => buildEventPayload({ ...base, category: 'happy_hour' })).toThrow(/category/);
    expect(() => buildEventPayload({ ...base, category: 'nonsense' })).toThrow(/category/);
  });

  test('requires venue identity, title, startTime, and localDate', () => {
    expect(() => buildEventPayload({ ...base, venue: { ...venue, id: '' } })).toThrow(/venue/);
    expect(() => buildEventPayload({ ...base, venue: { ...venue, cohort: '' } })).toThrow(/cohort/);
    expect(() => buildEventPayload({ ...base, title: '' })).toThrow(/title/);
    expect(() => buildEventPayload({ ...base, startTime: undefined })).toThrow(/startTime/);
    expect(() => buildEventPayload({ ...base, localDate: '' })).toThrow(/localDate/);
  });
});

describe('buildHappyHourPayload', () => {
  const base = {
    venue,
    dayOfWeek: 3,
    startLocal: '17:00',
    endLocal: '19:00',
    dealSummary: '$5 wells, $3 drafts',
  };

  test('builds a recurring deal with the denormalized venue block', () => {
    const p = buildHappyHourPayload(base);
    expect(p.venueId).toBe('ovt:abc');
    expect(p.metro).toBe(getMetroForCity('boston'));
    expect(p.dayOfWeek).toBe(3);
    expect(p.startLocal).toBe('17:00');
    expect(p.endLocal).toBe('19:00');
    expect(p.dealSummary).toBe('$5 wells, $3 drafts');
    expect(p.isActive).toBe(true);
    expect(p.drinkPrices).toBeNull();
  });

  test('rejects a dayOfWeek outside 0..6', () => {
    expect(() => buildHappyHourPayload({ ...base, dayOfWeek: 7 })).toThrow(/dayOfWeek/);
    expect(() => buildHappyHourPayload({ ...base, dayOfWeek: -1 })).toThrow(/dayOfWeek/);
  });

  test('requires the deal window and summary', () => {
    expect(() => buildHappyHourPayload({ ...base, startLocal: '' })).toThrow(/startLocal/);
    expect(() => buildHappyHourPayload({ ...base, endLocal: '' })).toThrow(/endLocal/);
    expect(() => buildHappyHourPayload({ ...base, dealSummary: '' })).toThrow(/dealSummary/);
  });
});
