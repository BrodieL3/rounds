const { computeRankings, updateRatings, SENTIMENT_SEED } = require('../ranking');

describe('computeRankings', () => {
  const venues = [
    { id: 'v1', name: 'The Nocturne', type: 'cocktail lounge' },
    { id: 'v2', name: 'Velvet Room', type: 'cocktail lounge' },
    { id: 'v3', name: 'Midnight Orchard', type: 'cocktail lounge' },
  ];

  test('returns all venues with default rating 1500 when no comparisons exist', () => {
    const result = computeRankings(venues, []);
    expect(result).toHaveLength(3);
    result.forEach(v => {
      expect(v.rating).toBe(1500);
    });
  });

  test('winner rating increases and loser rating decreases after a comparison', () => {
    const comparisons = [{ a: 'v1', b: 'v2', result: 'v1' }];
    const result = computeRankings(venues, comparisons);
    const v1 = result.find(v => v.id === 'v1');
    const v2 = result.find(v => v.id === 'v2');
    expect(v1.rating).toBeGreaterThan(1500);
    expect(v2.rating).toBeLessThan(1500);
  });

  test('batch dummy data produces transitive ordering', () => {
    const batchVenues = [
      { id: 'a', name: 'Alpha', type: 'dive bar' },
      { id: 'b', name: 'Beta', type: 'dive bar' },
      { id: 'c', name: 'Gamma', type: 'dive bar' },
      { id: 'd', name: 'Delta', type: 'dive bar' },
    ];

    const comparisons = [
      // a dominates
      { a: 'a', b: 'b', result: 'a' },
      { a: 'a', b: 'c', result: 'a' },
      { a: 'a', b: 'd', result: 'a' },
      { a: 'a', b: 'b', result: 'a' },
      { a: 'a', b: 'c', result: 'a' },
      // b beats c and d
      { a: 'b', b: 'c', result: 'b' },
      { a: 'b', b: 'd', result: 'b' },
      { a: 'b', b: 'c', result: 'b' },
      // c beats d
      { a: 'c', b: 'd', result: 'c' },
      { a: 'c', b: 'd', result: 'c' },
      // a few upsets to keep it realistic
      { a: 'b', b: 'a', result: 'b' },
      { a: 'd', b: 'c', result: 'd' },
    ];

    const result = computeRankings(batchVenues, comparisons);
    const ids = result.map(v => v.id);
    expect(ids).toEqual(['a', 'b', 'c', 'd']);
  });

  test('too-tough is a draw that pulls the two ratings toward each other (ADR 008 §1)', () => {
    const gap = (result) =>
      result.find(v => v.id === 'v1').rating - result.find(v => v.id === 'v2').rating;

    const decisiveOnly = computeRankings(venues, [{ a: 'v1', b: 'v2', result: 'v1' }]);
    const withDraw = computeRankings(venues, [
      { a: 'v1', b: 'v2', result: 'v1' },
      { a: 'v1', b: 'v2', result: 'too-tough' },
    ]);

    expect(gap(withDraw)).toBeGreaterThan(0);              // v1 still ahead
    expect(gap(withDraw)).toBeLessThan(gap(decisiveOnly)); // but the draw closed the gap
  });

  test('seeds initial ratings from sentiment band (ADR 008 §1)', () => {
    const seeded = computeRankings(venues, [], {
      seedBySentiment: { v1: 'loved', v2: 'fine', v3: 'disliked' },
    });
    expect(seeded.find(v => v.id === 'v1').rating).toBe(SENTIMENT_SEED.loved);
    expect(seeded.find(v => v.id === 'v2').rating).toBe(SENTIMENT_SEED.fine);
    expect(seeded.find(v => v.id === 'v3').rating).toBe(SENTIMENT_SEED.disliked);
    expect(seeded.map(v => v.id)).toEqual(['v1', 'v2', 'v3']); // ordered by seed, no comparisons
  });

  test('updateRatings nudges winner up and loser down in one incremental step', () => {
    const next = updateRatings({ v1: 1500, v2: 1500 }, { a: 'v1', b: 'v2', result: 'v1' });
    expect(next.v1).toBeGreaterThan(1500);
    expect(next.v2).toBeLessThan(1500);
    // too-tough draw on equal ratings leaves them unchanged
    const drawn = updateRatings({ v1: 1500, v2: 1500 }, { a: 'v1', b: 'v2', result: 'too-tough' });
    expect(drawn.v1).toBe(1500);
    expect(drawn.v2).toBe(1500);
  });

  test('large batch with 6 venues sorts by dominant win rate', () => {
    const bigVenues = [
      { id: 'v1', name: 'One', type: 'club' },
      { id: 'v2', name: 'Two', type: 'club' },
      { id: 'v3', name: 'Three', type: 'club' },
      { id: 'v4', name: 'Four', type: 'club' },
      { id: 'v5', name: 'Five', type: 'club' },
      { id: 'v6', name: 'Six', type: 'club' },
    ];

    // v1 > v2 > v3 > v4 > v5 > v6 with light noise
    const comparisons = [
      { a: 'v1', b: 'v2', result: 'v1' },
      { a: 'v1', b: 'v2', result: 'v1' },
      { a: 'v1', b: 'v3', result: 'v1' },
      { a: 'v1', b: 'v4', result: 'v1' },
      { a: 'v1', b: 'v5', result: 'v1' },
      { a: 'v1', b: 'v6', result: 'v1' },
      { a: 'v2', b: 'v3', result: 'v2' },
      { a: 'v2', b: 'v3', result: 'v2' },
      { a: 'v2', b: 'v4', result: 'v2' },
      { a: 'v2', b: 'v5', result: 'v2' },
      { a: 'v2', b: 'v6', result: 'v2' },
      { a: 'v3', b: 'v4', result: 'v3' },
      { a: 'v3', b: 'v4', result: 'v3' },
      { a: 'v3', b: 'v5', result: 'v3' },
      { a: 'v3', b: 'v6', result: 'v3' },
      { a: 'v4', b: 'v5', result: 'v4' },
      { a: 'v4', b: 'v5', result: 'v4' },
      { a: 'v4', b: 'v6', result: 'v4' },
      { a: 'v5', b: 'v6', result: 'v5' },
      { a: 'v5', b: 'v6', result: 'v5' },
      // noise: a few upsets
      { a: 'v2', b: 'v1', result: 'v2' },
      { a: 'v4', b: 'v3', result: 'v4' },
      { a: 'v6', b: 'v5', result: 'v6' },
    ];

    const result = computeRankings(bigVenues, comparisons);
    const ids = result.map(v => v.id);
    expect(ids).toEqual(['v1', 'v2', 'v3', 'v4', 'v5', 'v6']);
  });
});
