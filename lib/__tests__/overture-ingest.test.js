const {
  categoryToCohort,
  localityToCity,
  composeAddress,
  isNonNightlife,
  shapeVenue,
  buildCatalog,
  ROUNDS_COHORTS,
} = require('../overture-ingest');

describe('overture-ingest mapping', () => {
  test('maps specific bar categories to the right cohort with high confidence', () => {
    expect(categoryToCohort('cocktail_bar')).toEqual({ cohort: 'cocktail_bar', cohortConfidence: 'high' });
    expect(categoryToCohort('wine_bar')).toEqual({ cohort: 'wine_bar', cohortConfidence: 'high' });
    expect(categoryToCohort('sports_bar')).toEqual({ cohort: 'sports_bar', cohortConfidence: 'high' });
    expect(categoryToCohort('gastropub')).toEqual({ cohort: 'pub', cohortConfidence: 'high' });
    expect(categoryToCohort('brewery')).toEqual({ cohort: 'pub', cohortConfidence: 'high' });
    expect(categoryToCohort('night_club')).toEqual({ cohort: 'night_club', cohortConfidence: 'high' });
    expect(categoryToCohort('dive_bar')).toEqual({ cohort: 'dive_bar', cohortConfidence: 'high' });
  });

  test('demotes ambiguous lounge/bar to low, keeps specific lounges high', () => {
    expect(categoryToCohort('lounge')).toEqual({ cohort: 'cocktail_bar', cohortConfidence: 'low' });
    expect(categoryToCohort('bar')).toEqual({ cohort: 'cocktail_bar', cohortConfidence: 'low' });
    expect(categoryToCohort('cocktail_lounge')).toEqual({ cohort: 'cocktail_bar', cohortConfidence: 'high' });
    expect(categoryToCohort('hotel_bar')).toEqual({ cohort: 'cocktail_bar', cohortConfidence: 'high' });
  });

  test('generic bar borrows a specific cohort from alternates, else defaults low', () => {
    expect(categoryToCohort('bar', ['sports_bar'])).toEqual({ cohort: 'sports_bar', cohortConfidence: 'low' });
    expect(categoryToCohort('bar', [])).toEqual({ cohort: 'cocktail_bar', cohortConfidence: 'low' });
    expect(categoryToCohort('tiki_bar')).toEqual({ cohort: 'cocktail_bar', cohortConfidence: 'low' });
  });

  test('does not sweep in non-bars that merely contain "bar"', () => {
    expect(categoryToCohort('coffee_shop')).toBeNull();
    expect(categoryToCohort('barber')).toBeNull();
    expect(categoryToCohort('barbecue_restaurant')).toBeNull();
  });

  test('isNonNightlife flags food/wellness bars and dorm/art venues by name', () => {
    expect(isNonNightlife('Zen Oxygen Bar', 'oxygen_bar')).toBe(true);
    expect(isNonNightlife('Paint Corner Art Bar', 'bar')).toBe(true);
    expect(isNonNightlife('Smith Residence Hall Lounge', 'lounge')).toBe(true);
    expect(isNonNightlife('The Hawthorne', 'cocktail_bar')).toBe(false);
  });

  test('localityToCity buckets Cambridge vs everything-else-Boston', () => {
    expect(localityToCity('Cambridge')).toBe('cambridge');
    expect(localityToCity('Boston')).toBe('boston');
    expect(localityToCity('Allston')).toBe('boston');
  });

  test('composeAddress builds a geocodable string and skips blank parts', () => {
    expect(composeAddress({ street: '80 Beverly St', locality: 'Boston', region: 'MA', postcode: '02114' }))
      .toBe('80 Beverly St, Boston, MA 02114');
    expect(composeAddress({ street: '1 Main St', locality: 'Cambridge', region: '', postcode: '' }))
      .toBe('1 Main St, Cambridge');
  });

  test('shapeVenue emits the exact catalog schema with no google/price/photo fields', () => {
    const v = shapeVenue({
      id: 'abc123', name: 'Test Bar', category: 'cocktail_bar', alt_categories: ['lounge'],
      latitude: 42.36, longitude: -71.05, street: '5 Test St', locality: 'Boston', region: 'MA', postcode: '02114',
    });
    expect(v.id).toBe('ovt:abc123');
    expect(v.cohort).toBe('cocktail_bar');
    expect(v.city).toBe('boston');
    expect(v.address).toBe('5 Test St, Boston, MA 02114');
    expect(v.location).toEqual({ latitude: 42.36, longitude: -71.05 });
    expect(v.location.latitude).toBe(v.latitude);
    expect(v.source).toBe('overture-places');
    expect(v).not.toHaveProperty('priceLevel');
    expect(v).not.toHaveProperty('photos');
    expect(v.types.every((t) => !t.includes('google'))).toBe(true);
    expect(ROUNDS_COHORTS.has(v.cohort)).toBe(true);
  });

  test('shapeVenue drops unmappable, non-nightlife, nameless, or coordinate-less rows', () => {
    expect(shapeVenue({ id: '1', name: 'X', category: 'coffee_shop', latitude: 42.3, longitude: -71 })).toBeNull();
    expect(shapeVenue({ id: '2', name: '', category: 'bar', latitude: 42.3, longitude: -71 })).toBeNull();
    expect(shapeVenue({ id: '3', name: 'Y', category: 'bar', latitude: NaN, longitude: -71 })).toBeNull();
    expect(shapeVenue({ id: '4', name: 'Paint Corner Art Bar', category: 'bar', latitude: 42.3, longitude: -71, street: '31 Belmont St', locality: 'Cambridge' })).toBeNull();
    expect(shapeVenue({ id: '5', name: 'Zen Oxygen Bar', category: 'oxygen_bar', latitude: 42.3, longitude: -71, street: '5 X St', locality: 'Boston' })).toBeNull();
  });

  test('buildCatalog collapses name+street near-duplicates, preferring high confidence', () => {
    const cat = buildCatalog([
      { id: 'a1', name: 'The Last Drop', category: 'bar', latitude: 42.36, longitude: -71.05, street: '596 Washington St', locality: 'Boston' },
      { id: 'a2', name: 'Last Drop', category: 'sports_bar', latitude: 42.3601, longitude: -71.0501, street: '596 Washington St', locality: 'Brighton' },
      { id: 'a3', name: 'The Last Drop', category: 'bar', latitude: 42.3599, longitude: -71.0499, street: '596 Washington St', locality: 'Boston' },
      { id: 'b', name: 'Distinct Bar', category: 'wine_bar', latitude: 42.37, longitude: -71.11, street: '1 Main St', locality: 'Cambridge' },
    ]);
    const boston = cat.cities.boston.venues;
    expect(boston).toHaveLength(1); // three "Last Drop" records collapse to one
    expect(boston[0].cohort).toBe('sports_bar'); // high-confidence record wins over generic 'bar'
    expect(cat.cities.cambridge.venues).toHaveLength(1);
    expect(Object.keys(cat.cities).sort()).toEqual(['boston', 'cambridge']);
    expect(cat.source).toBe('overture-places');
  });
});
