const venueSeed = require('../../assets/venues.json');

const ALLOWED_COHORTS = new Set([
  'cocktail_bar',
  'wine_bar',
  'sports_bar',
  'pub',
  'night_club',
  'dive_bar',
]);

function allVenuesByCity() {
  return Object.entries(venueSeed.cities).flatMap(([cityKey, city]) =>
    city.venues.map((venue) => ({ cityKey, venue }))
  );
}

describe('OpenStreetMap venue seed data', () => {
  test('uses OpenStreetMap source metadata and exactly Boston/Cambridge city keys', () => {
    expect(venueSeed).toHaveProperty('cities');
    expect(venueSeed.attribution).toEqual(expect.stringContaining('OpenStreetMap'));
    expect(venueSeed.attribution).toEqual(expect.stringContaining('ODbL'));
    expect(venueSeed.source).toBe('openstreetmap-overpass');
    expect(Object.keys(venueSeed.cities).sort()).toEqual(['boston', 'cambridge']);
  });

  test('contains enough real Boston and Cambridge venues with no Google artifacts', () => {
    const venues = allVenuesByCity();
    expect(venues.length).toBeGreaterThanOrEqual(50);
    expect(venueSeed.cities.boston.venues.length).toBeGreaterThanOrEqual(1);
    expect(venueSeed.cities.cambridge.venues.length).toBeGreaterThanOrEqual(1);

    const serialized = JSON.stringify(venueSeed);
    expect(serialized).not.toMatch(/ChIJ/);
    expect(serialized).not.toMatch(/google/i);
    expect(serialized).not.toMatch(/photo_reference|places\.googleapis|maps\.googleapis/i);
  });

  test('keeps every venue schema-compatible and quality-gated', () => {
    for (const { cityKey, venue } of allVenuesByCity()) {
      expect(venue.id).toMatch(/^osm:(node|way|relation)\/\d+$/);
      expect(venue.name).toEqual(expect.any(String));
      expect(venue.name.trim()).not.toBe('');
      expect(venue.city).toBe(cityKey);
      expect(ALLOWED_COHORTS.has(venue.cohort)).toBe(true);
      expect(['high', 'low']).toContain(venue.cohortConfidence);

      expect(Number.isFinite(venue.latitude)).toBe(true);
      expect(Number.isFinite(venue.longitude)).toBe(true);
      expect(Number.isFinite(venue.location && venue.location.latitude)).toBe(true);
      expect(Number.isFinite(venue.location && venue.location.longitude)).toBe(true);
      expect(venue.location.latitude).toBe(venue.latitude);
      expect(venue.location.longitude).toBe(venue.longitude);

      expect(venue).not.toHaveProperty('priceLevel');
      expect(venue).not.toHaveProperty('photos');
      expect(venue.types.every((type) => !String(type).toLowerCase().includes('google'))).toBe(true);
    }
  });
});
