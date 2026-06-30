// ISC-53: pure distance helpers for nearest-bar browsing.
const {
  haversineMeters,
  sortVenuesByDistance,
  formatDistance,
} = require('../geo');

describe('haversineMeters (ISC-53)', () => {
  test('returns 0 for identical points', () => {
    const fenway = { latitude: 42.3467, longitude: -71.0972 };

    expect(haversineMeters(fenway, fenway)).toBe(0);
  });

  test('matches a known Boston distance within tolerance', () => {
    const fenway = { latitude: 42.3467, longitude: -71.0972 };
    const bostonCommon = { latitude: 42.3551, longitude: -71.0657 };

    const meters = haversineMeters(fenway, bostonCommon);

    expect(meters).toBeGreaterThan(2550);
    expect(meters).toBeLessThan(2850);
  });

  test('keeps antipodal distances finite', () => {
    const meters = haversineMeters(
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 180 }
    );

    expect(Number.isFinite(meters)).toBe(true);
    expect(meters).toBeGreaterThan(20000000);
    expect(meters).toBeLessThan(20100000);
  });
});

describe('sortVenuesByDistance (ISC-53)', () => {
  test('returns venues nearest-first by top-level coordinates', () => {
    const origin = { latitude: 42.3551, longitude: -71.0657 };
    const venues = [
      { id: 'fenway', latitude: 42.3467, longitude: -71.0972 },
      { id: 'common', latitude: 42.3551, longitude: -71.0657 },
      { id: 'td-garden', latitude: 42.3662, longitude: -71.0621 },
    ];

    const sorted = sortVenuesByDistance(venues, origin);

    expect(sorted.map((venue) => venue.id)).toEqual(['common', 'td-garden', 'fenway']);
    expect(sorted.every((venue) => Number.isFinite(venue.distanceMeters))).toBe(true);
  });

  test('keeps missing-coordinate venues with null distance at the end', () => {
    const origin = { latitude: 0, longitude: 0 };
    const venues = [
      { id: 'missing' },
      { id: 'far', latitude: 0.02, longitude: 0 },
      { id: 'near', latitude: 0.01, longitude: 0 },
      { id: 'nan', latitude: NaN, longitude: 0 },
    ];

    const sorted = sortVenuesByDistance(venues, origin);

    expect(sorted).toHaveLength(4);
    expect(sorted.map((venue) => venue.id)).toEqual(['near', 'far', 'missing', 'nan']);
    expect(sorted[2].distanceMeters).toBeNull();
    expect(sorted[3].distanceMeters).toBeNull();
  });

  test('preserves original order for equal distances', () => {
    const origin = { latitude: 0, longitude: 0 };
    const venues = [
      { id: 'east', latitude: 0, longitude: 0.01 },
      { id: 'west', latitude: 0, longitude: -0.01 },
      { id: 'here', latitude: 0, longitude: 0 },
    ];

    const sorted = sortVenuesByDistance(venues, origin);

    expect(sorted.map((venue) => venue.id)).toEqual(['here', 'east', 'west']);
  });

  test('does not mutate the input array or venue objects', () => {
    const origin = { latitude: 0, longitude: 0 };
    const venues = [
      { id: 'far', latitude: 0.02, longitude: 0 },
      { id: 'near', latitude: 0.01, longitude: 0 },
    ];
    const originalOrder = venues.map((venue) => venue.id);

    const sorted = sortVenuesByDistance(venues, origin);

    expect(sorted).not.toBe(venues);
    expect(sorted[0]).not.toBe(venues[1]);
    expect(venues.map((venue) => venue.id)).toEqual(originalOrder);
    expect(Object.prototype.hasOwnProperty.call(venues[0], 'distanceMeters')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(venues[1], 'distanceMeters')).toBe(false);
  });

  test('invalid origin preserves order with null distances and no throw', () => {
    const venues = [
      { id: 'a', latitude: 0, longitude: 0 },
      { id: 'b', latitude: 0.01, longitude: 0 },
    ];

    expect(() => sortVenuesByDistance(venues, null)).not.toThrow();

    const sorted = sortVenuesByDistance(venues, { latitude: Infinity, longitude: 0 });

    expect(sorted.map((venue) => venue.id)).toEqual(['a', 'b']);
    expect(sorted.map((venue) => venue.distanceMeters)).toEqual([null, null]);
    expect(sorted[0]).not.toBe(venues[0]);
  });
});

describe('formatDistance (ISC-53)', () => {
  test('renders an empty placeholder for missing or invalid distances', () => {
    expect(formatDistance(null)).toBe('');
    expect(formatDistance(undefined)).toBe('');
    expect(formatDistance(Infinity)).toBe('');
  });

  test('renders nearby distances in meters', () => {
    expect(formatDistance(4)).toBe('4 m');
    expect(formatDistance(654)).toBe('650 m');
    expect(formatDistance(650)).toMatch(/^\d+ m$/);
  });

  test('renders longer distances in miles with one decimal', () => {
    expect(formatDistance(2700)).toBe('1.7 mi');
    expect(formatDistance(2700)).toMatch(/^\d+\.\d mi$/);
  });
});
