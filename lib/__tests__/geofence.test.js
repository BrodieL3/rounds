const { isWithinCheckinRange } = require('../checkin/geofence');

const venue = { latitude: 42.357, longitude: -71.0707 };
const near = { latitude: 42.357 + 0.0009, longitude: -71.0707 }; // ~100m north
const far = { latitude: 42.357 + 0.0045, longitude: -71.0707 };  // ~500m north

describe('isWithinCheckinRange', () => {
  test('true when the user is at the venue', () => {
    expect(isWithinCheckinRange(venue, venue)).toBe(true);
  });

  test('true within the default 150m radius', () => {
    expect(isWithinCheckinRange(near, venue)).toBe(true);
  });

  test('false beyond the radius', () => {
    expect(isWithinCheckinRange(far, venue)).toBe(false);
  });

  test('respects a custom radius', () => {
    expect(isWithinCheckinRange(near, venue, 50)).toBe(false);
    expect(isWithinCheckinRange(near, venue, 200)).toBe(true);
  });

  test('false for invalid coordinates', () => {
    expect(isWithinCheckinRange(null, venue)).toBe(false);
    expect(isWithinCheckinRange({ latitude: 'x', longitude: 0 }, venue)).toBe(false);
  });
});
