const { getVenueCoordinates } = require('../venue-coordinates');

describe('getVenueCoordinates', () => {
  test('prefers the canonical venue.location block', () => {
    expect(getVenueCoordinates({
      latitude: 1,
      longitude: 2,
      location: { latitude: 42.355, longitude: -71.064 },
    })).toEqual({ latitude: 42.355, longitude: -71.064 });
  });

  test('falls back to top-level coordinates from ingestion payloads', () => {
    expect(getVenueCoordinates({ latitude: 42.36, longitude: -71.05 }))
      .toEqual({ latitude: 42.36, longitude: -71.05 });
  });

  test('falls back to lat/lng aliases from denormalized event docs', () => {
    expect(getVenueCoordinates({ lat: 42.37, lng: -71.1 }))
      .toEqual({ latitude: 42.37, longitude: -71.1 });
  });

  test('returns null when either coordinate is missing or non-finite', () => {
    expect(getVenueCoordinates({ latitude: 42.36 })).toBeNull();
    expect(getVenueCoordinates({ latitude: NaN, longitude: -71.05 })).toBeNull();
  });
});
