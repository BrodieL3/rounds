const {
  formatVenueMetadata,
  formatVenueMetadataLines,
  getVenueNeighborhood,
} = require('../venue-display');

describe('venue display helpers', () => {
  test('prefers an explicit venue neighborhood over street address', () => {
    const venue = {
      cohort: 'cocktail_bar',
      neighborhood: 'West Village',
      address: '75 9th Ave, New York, NY 10011, USA',
    };

    expect(formatVenueMetadata(venue, 'Cocktail Lounge', 'nyc')).toBe('Cocktail Lounge · West Village');
  });

  test('derives a clean NYC neighborhood from coordinates when seed data has no neighborhood field', () => {
    const venue = {
      cohort: 'cocktail_bar',
      location: { latitude: 40.7422143, longitude: -74.0046814 },
      address: '75 9th Ave, New York, NY 10011, USA',
    };

    expect(getVenueNeighborhood(venue, 'nyc')).toBe('West Village');
    expect(formatVenueMetadata(venue, 'Cocktail Lounge', 'nyc')).toBe('Cocktail Lounge · West Village');
  });

  test('formats dense list metadata as price and category over local area', () => {
    const venue = {
      cohort: 'cocktail_bar',
      location: { latitude: 40.7422143, longitude: -74.0046814 },
      address: '75 9th Ave, New York, NY 10011, USA',
      priceLevel: 'PRICE_LEVEL_EXPENSIVE',
    };

    expect(formatVenueMetadataLines(venue, 'Cocktail Lounge', 'nyc')).toEqual({
      detail: '$$$ | Cocktail Lounge',
      area: 'West Village, New York, NY',
      status: null,
    });
  });

  test('adds compact status metadata when live attributes are available', () => {
    const venue = {
      cohort: 'cocktail_bar',
      priceLevel: 'PRICE_LEVEL_MODERATE',
      address: '123 Main St, Boston, MA 02116, USA',
      distanceMiles: 5,
      hours: { openNow: true, closesAt: '2:00 AM' },
    };

    expect(formatVenueMetadataLines(venue, 'Cocktail Lounge', 'unknown')).toEqual({
      detail: '$$ | Cocktail Lounge',
      area: 'Boston, MA',
      status: '5 mi • Open • Closes 2:00 AM',
    });
  });

  test('falls back to a short address when no neighborhood is available', () => {
    const venue = {
      cohort: 'cocktail_bar',
      address: '123 Main St, Example City, USA',
    };

    expect(formatVenueMetadata(venue, 'Cocktail Lounge', 'unknown')).toBe('Cocktail Lounge · 123 Main St');
  });

  test('derives a Cambridge neighborhood from coordinates (ADR 007 beta pool)', () => {
    const venue = {
      cohort: 'cocktail_bar',
      location: { latitude: 42.373, longitude: -71.119 },
    };

    expect(getVenueNeighborhood(venue, 'cambridge')).toBe('Harvard Square');
  });
});
