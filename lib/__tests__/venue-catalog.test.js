const {
  flattenCatalogVenues,
  buildVenueCatalog,
  searchVenues,
  getAttribution,
} = require('../venue-catalog');

// F3 slice 2 (browse/find): a brand-new, zero-post, zero-friend user must be
// able to BROWSE the seeded catalog and SEARCH it to FIND a bar to log. These
// are pure-lib units (no JSX/RTL in this repo) over the cities-keyed seed.
const venueSeed = {
  attribution: '© OpenStreetMap contributors, ODbL. https://www.openstreetmap.org/copyright',
  source: 'openstreetmap-overpass',
  license: 'ODbL',
  cities: {
    boston: {
      venues: [
        {
          id: 'osm:node/2',
          name: 'Wally\'s Cafe',
          cohort: 'cocktail_bar',
          city: 'boston',
          address: '427 Massachusetts Ave, Boston MA 02118',
          latitude: 42.341,
          longitude: -71.081,
          location: { latitude: 42.341, longitude: -71.081 },
        },
        {
          id: 'osm:node/1',
          name: 'Alibi Bar',
          cohort: 'pub',
          city: 'boston',
          address: '215 Charles St, Boston MA 02114',
          latitude: 42.361,
          longitude: -71.070,
          location: { latitude: 42.361, longitude: -71.070 },
        },
      ],
    },
    cambridge: {
      venues: [
        {
          id: 'osm:way/3',
          name: 'The Plough and Stars',
          cohort: 'pub',
          city: 'cambridge',
          address: '912 Massachusetts Ave, Cambridge MA 02139',
          latitude: 42.367,
          longitude: -71.104,
          location: { latitude: 42.367, longitude: -71.104 },
        },
      ],
    },
  },
};

describe('venue catalog — flatten', () => {
  test('flattens every seeded city into one corpus, tagging each venue with its cityKey', () => {
    const venues = flattenCatalogVenues(venueSeed);
    expect(venues).toHaveLength(3);
    expect(venues.map((v) => v.id).sort()).toEqual(['osm:node/1', 'osm:node/2', 'osm:way/3']);
    expect(venues.every((v) => typeof v.cityKey === 'string')).toBe(true);
    const cambridge = venues.find((v) => v.id === 'osm:way/3');
    expect(cambridge.cityKey).toBe('cambridge');
  });

  test('is defensive: missing/empty seed yields an empty corpus, never throws', () => {
    expect(flattenCatalogVenues(undefined)).toEqual([]);
    expect(flattenCatalogVenues({})).toEqual([]);
    expect(flattenCatalogVenues({ cities: {} })).toEqual([]);
  });
});

describe('venue catalog — grouped sections', () => {
  test('groups venues by city with a human label and name-sorted rows (scannable browse)', () => {
    const sections = buildVenueCatalog(venueSeed);
    expect(sections.map((s) => s.cityKey)).toEqual(['boston', 'cambridge']);
    expect(sections.map((s) => s.title)).toEqual(['Boston', 'Cambridge']);

    const boston = sections.find((s) => s.cityKey === 'boston');
    // Alphabetical within a section so the list is scannable, not seed-ordered.
    expect(boston.data.map((v) => v.name)).toEqual(['Alibi Bar', "Wally's Cafe"]);
    expect(boston.count).toBe(2);
  });

  test('omits empty cities and never throws on a missing seed', () => {
    expect(buildVenueCatalog(undefined)).toEqual([]);
    const sparse = buildVenueCatalog({ cities: { boston: { venues: [] }, cambridge: venueSeed.cities.cambridge } });
    expect(sparse.map((s) => s.cityKey)).toEqual(['cambridge']);
  });
});

describe('venue catalog — search', () => {
  const corpus = flattenCatalogVenues(venueSeed);

  test('matches on venue name, case-insensitively', () => {
    const results = searchVenues(corpus, 'alibi');
    expect(results.map((v) => v.id)).toEqual(['osm:node/1']);
  });

  test('matches on cohort label so "pub" finds pubs in both cities, name-sorted', () => {
    const results = searchVenues(corpus, 'pub');
    expect(results.map((v) => v.name)).toEqual(['Alibi Bar', 'The Plough and Stars']);
  });

  test('matches on derived neighborhood text', () => {
    // 42.361/-71.070 falls in the Boston "Downtown" neighborhood bounds.
    const results = searchVenues(corpus, 'downtown');
    expect(results.map((v) => v.id)).toContain('osm:node/1');
  });

  test('blank / too-short query returns no results (caller-safe, no full dump)', () => {
    expect(searchVenues(corpus, '')).toEqual([]);
    expect(searchVenues(corpus, '   ')).toEqual([]);
    expect(searchVenues(corpus, 'a')).toEqual([]);
  });

  test('no match returns an empty array, never throws', () => {
    expect(searchVenues(corpus, 'zzzznotabar')).toEqual([]);
    expect(searchVenues(undefined, 'pub')).toEqual([]);
  });
});

describe('venue catalog — attribution (ISC-11)', () => {
  test('surfaces the ODbL attribution string from the seed', () => {
    expect(getAttribution(venueSeed)).toEqual(expect.stringContaining('OpenStreetMap'));
    expect(getAttribution(venueSeed)).toEqual(expect.stringContaining('ODbL'));
  });

  test('falls back to a safe ODbL string when the seed omits attribution', () => {
    expect(getAttribution({})).toEqual(expect.stringContaining('OpenStreetMap'));
  });
});
