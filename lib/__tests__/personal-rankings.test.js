const {
  buildStackRankings,
  getMyTopSpots,
  normalizeComparison,
} = require('../personal-rankings');

describe('personal ranking projections', () => {
  const venues = [
    { id: 'a', name: 'Alpha', cohort: 'cocktail_bar' },
    { id: 'b', name: 'Beta', cohort: 'cocktail_bar' },
    { id: 'c', name: 'Gamma', cohort: 'cocktail_bar' },
    { id: 'd', name: 'Delta', cohort: 'wine_bar' },
  ];

  test('normalizes persisted comparison field names from Firestore', () => {
    expect(normalizeComparison({ venueA: 'a', venueB: 'b', result: 'a' })).toEqual({
      a: 'a',
      b: 'b',
      result: 'a',
      cohort: undefined,
    });
  });

  test('builds sequential personal ranks for a selected venue list', () => {
    const comparisons = [
      { venueA: 'a', venueB: 'b', result: 'a' },
      { venueA: 'a', venueB: 'c', result: 'a' },
      { venueA: 'b', venueB: 'c', result: 'b' },
    ];

    const ranked = buildStackRankings(venues.slice(0, 3), comparisons);

    expect(ranked.map((v) => ({ id: v.id, rank: v.personalRank }))).toEqual([
      { id: 'a', rank: 1 },
      { id: 'b', rank: 2 },
      { id: 'c', rank: 3 },
    ]);
    expect(ranked.every((v) => v.hasPersonalRank)).toBe(true);
  });

  test('does not invent personal ranks when no pairwise choices exist', () => {
    const ranked = buildStackRankings(venues, []);

    expect(ranked.map((v) => v.personalRank)).toEqual([null, null, null, null]);
    expect(ranked.every((v) => v.hasPersonalRank === false)).toBe(true);
  });

  test('leaves un-compared venues without a personal rank badge', () => {
    const ranked = buildStackRankings(venues, [
      { venueA: 'a', venueB: 'b', result: 'a' },
    ]);

    const delta = ranked.find((v) => v.id === 'd');
    expect(delta.personalRank).toBe(null);
    expect(delta.hasPersonalRank).toBe(false);
  });

  test('too-tough comparisons do not count toward personalComparisonCount or hasPersonalRank', () => {
    const comparisons = [
      { venueA: 'a', venueB: 'b', result: 'too-tough' },
    ];

    const ranked = buildStackRankings(venues.slice(0, 2), comparisons);

    expect(ranked.every((v) => v.hasPersonalRank === false)).toBe(true);
    expect(ranked.every((v) => v.personalComparisonCount === 0)).toBe(true);
  });

  test('cohort option excludes cross-cohort comparisons', () => {
    const mixedComparisons = [
      { a: 'a', b: 'b', result: 'a', cohort: 'cocktail_bar' },
      { a: 'd', b: 'b', result: 'd', cohort: 'wine_bar' },
    ];

    const cocktailRanked = buildStackRankings(venues, mixedComparisons, { cohort: 'cocktail_bar' });
    const wineRanked = buildStackRankings(venues, mixedComparisons, { cohort: 'wine_bar' });

    const cocktailDelta = cocktailRanked.find((v) => v.id === 'd');
    expect(cocktailDelta.hasPersonalRank).toBe(false);

    const wineDelta = wineRanked.find((v) => v.id === 'a');
    expect(wineDelta.hasPersonalRank).toBe(false);
  });

  test('returns clean top spots from compared venues only', () => {
    const comparisons = [
      { venueA: 'a', venueB: 'b', result: 'a' },
      { venueA: 'a', venueB: 'c', result: 'a' },
      { venueA: 'b', venueB: 'c', result: 'b' },
    ];

    const topSpots = getMyTopSpots(venues, comparisons, { limit: 2 });

    expect(topSpots.map((v) => ({ id: v.id, rank: v.personalRank }))).toEqual([
      { id: 'a', rank: 1 },
      { id: 'b', rank: 2 },
    ]);
  });

  test('top spots honors cohort filtering options', () => {
    const comparisons = [
      { a: 'a', b: 'b', result: 'a', cohort: 'cocktail_bar' },
      { a: 'd', b: 'b', result: 'd', cohort: 'wine_bar' },
    ];

    const topSpots = getMyTopSpots(venues, comparisons, { limit: 3, cohort: 'cocktail_bar' });

    expect(topSpots.map((v) => v.id)).toEqual(['a', 'b']);
    expect(topSpots).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: 'd' })]));
  });
});

describe('ratings seed a hierarchy without comparisons (ADR 008 Tier A)', () => {
  const venues = [
    { id: 'a', name: 'A', cohort: 'cocktail_bar' },
    { id: 'b', name: 'B', cohort: 'cocktail_bar' },
    { id: 'c', name: 'C', cohort: 'cocktail_bar' },
  ];
  // The user rated three bars but never opened the compare flow.
  const sentimentByVenue = { a: 'disliked', b: 'loved', c: 'fine' };

  test('rated venues form a sentiment-ordered hierarchy with ZERO comparisons', () => {
    const ranked = buildStackRankings(venues, [], { cohort: 'cocktail_bar', sentimentByVenue })
      .filter((v) => v.hasPersonalRank);

    expect(ranked.map((v) => v.id)).toEqual(['b', 'c', 'a']); // loved > fine > disliked
    expect(ranked.map((v) => v.personalRank)).toEqual([1, 2, 3]);
    expect(ranked[0].personalScore).toBeGreaterThanOrEqual(7); // loved band
    expect(ranked[2].personalScore).toBeLessThan(5); // disliked band
  });

  test('comparisons still refine the order within a band', () => {
    // two loved bars: a head-to-head should order them, not leave them tied
    const sentiment = { b: 'loved', c: 'loved' };
    const ranked = buildStackRankings(
      venues.slice(1),
      [{ venueA: 'c', venueB: 'b', result: 'c', cohort: 'cocktail_bar' }],
      { cohort: 'cocktail_bar', sentimentByVenue: sentiment },
    ).filter((v) => v.hasPersonalRank);
    expect(ranked.map((v) => v.id)).toEqual(['c', 'b']);
  });

  test('an unrated catalog venue is NOT given a personal rank', () => {
    const withUnrated = [...venues, { id: 'd', name: 'D', cohort: 'cocktail_bar' }];
    const ranked = buildStackRankings(withUnrated, [], { cohort: 'cocktail_bar', sentimentByVenue });
    expect(ranked.find((v) => v.id === 'd').hasPersonalRank).toBe(false);
  });
});

describe('provisional gating + BT lower bound (ADR 010 §2)', () => {
  const venues = [
    { id: 'a', name: 'A', cohort: 'cocktail_bar' },
    { id: 'b', name: 'B', cohort: 'cocktail_bar' },
  ];

  test('a sentiment-seeded venue with no comparisons is provisional', () => {
    const ranked = buildStackRankings(venues, [], {
      cohort: 'cocktail_bar',
      sentimentByVenue: { a: 'loved', b: 'fine' },
    });
    expect(ranked.find((v) => v.id === 'a').provisional).toBe(true);
  });

  test('a venue confirmed by a decisive comparison is not provisional', () => {
    const ranked = buildStackRankings(
      venues,
      [{ venueA: 'a', venueB: 'b', result: 'a', cohort: 'cocktail_bar' }],
      { cohort: 'cocktail_bar', sentimentByVenue: { a: 'loved', b: 'loved' } },
    );
    expect(ranked.find((v) => v.id === 'a').provisional).toBe(false);
  });

  test('an unranked venue is never marked provisional', () => {
    const ranked = buildStackRankings(venues, [], {});
    expect(ranked.every((v) => v.provisional === false)).toBe(true);
  });

  test('the BT lower bound still preserves the sentiment-seeded score (ADR 008 §3 preserved)', () => {
    const ranked = buildStackRankings(venues, [], {
      cohort: 'cocktail_bar',
      sentimentByVenue: { a: 'loved', b: 'fine' },
    }).filter((v) => v.hasPersonalRank);
    expect(ranked.find((v) => v.id === 'a').personalScore).toBeGreaterThanOrEqual(7);
  });
});
