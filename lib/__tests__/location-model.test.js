const {
  CITIES, METROS, DEFAULT_METRO, getMetroForCity, getMetroCities,
} = require('../constants');

// ADR 007: location is a property of the venue; a metro is the discovery lens.
describe('location model (ADR 007)', () => {
  test('CITIES is the Boston + Cambridge beta pool only', () => {
    expect(Object.keys(CITIES).sort()).toEqual(['boston', 'cambridge']);
    expect(CITIES.boston).toBe('Boston');
    expect(CITIES.cambridge).toBe('Cambridge');
    // Retired: the phantom NYC label that tagged Boston bars "New York".
    expect(CITIES).not.toHaveProperty('nyc');
  });

  test('the Boston metro lens spans Boston and Cambridge', () => {
    expect(DEFAULT_METRO).toBe('boston');
    expect(getMetroCities('boston')).toEqual(['boston', 'cambridge']);
    expect(METROS.boston.label).toBe('Boston');
  });

  test('every beta city rolls up into the Boston metro', () => {
    expect(getMetroForCity('boston')).toBe('boston');
    expect(getMetroForCity('cambridge')).toBe('boston');
    expect(getMetroForCity('nyc')).toBeNull();
    expect(getMetroCities('unknown')).toEqual([]);
  });

  test('every CITIES key maps to a metro (no orphan city)', () => {
    for (const cityKey of Object.keys(CITIES)) {
      expect(getMetroForCity(cityKey)).not.toBeNull();
    }
  });
});
