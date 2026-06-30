// Behavioral contract for information-gain comparison selection (ADR 010 §3),
// the replacement for lib/compare-select.js. Properties only — no assertions on
// which exact informative pair wins when several are equally valid. Interface:
//
//   nextComparison({ venues, comparisons, sentimentByVenue, cooldownPairs, varianceTarget })
//     -> [aId, bId] | null
//
//     venues:          [{ id, ... }] — already cohort-scoped by the caller
//     comparisons:     [{ a, b, result, ... }] default []
//     sentimentByVenue:{ [id]: 'loved'|'fine'|'disliked' } — when present, only
//                       same-band pairs are eligible (never crosses a band)
//     cooldownPairs:   [[idA, idB], ...] — pairs to never return (order-insensitive);
//                       this is the "too-tough cools the PAIR, not the venue" fix
//     varianceTarget:  number — a venue whose posterior variance ≤ target is "placed";
//                       a pair is eligible only if at least one member is unplaced.
//                       Returns null when no eligible, informative pair remains.

const { nextComparison } = require('../duel-select');

const sameUnorderedPair = (pair, a, b) => {
  if (!pair) return false;
  const [x, y] = pair;
  return (x === a && y === b) || (x === b && y === a);
};

describe('duel-select nextComparison()', () => {
  test('returns null when fewer than two venues', () => {
    expect(nextComparison({ venues: [] })).toBeNull();
    expect(nextComparison({ venues: [{ id: 'v1' }] })).toBeNull();
  });

  test('cold start: two venues, no comparisons, no gate — returns the pair', () => {
    const pair = nextComparison({ venues: [{ id: 'v1' }, { id: 'v2' }], comparisons: [] });
    expect(sameUnorderedPair(pair, 'v1', 'v2')).toBe(true);
  });

  test('always returns a valid distinct pair drawn from the venue set', () => {
    const venues = [{ id: 'v1' }, { id: 'v2' }, { id: 'v3' }];
    const pair = nextComparison({ venues, comparisons: [] });
    expect(pair).not.toBeNull();
    expect(pair[0]).not.toBe(pair[1]);
    const ids = venues.map((v) => v.id);
    expect(ids).toContain(pair[0]);
    expect(ids).toContain(pair[1]);
  });

  test('never pairs across sentiment bands when sentiment is known', () => {
    const venues = [{ id: 'v1' }, { id: 'v2' }, { id: 'v3' }];
    const sentimentByVenue = { v1: 'loved', v2: 'loved', v3: 'fine' };
    // Only the two loved venues form a same-band pair; v3 is alone in its band.
    const pair = nextComparison({ venues, comparisons: [], sentimentByVenue });
    expect(sameUnorderedPair(pair, 'v1', 'v2')).toBe(true);
  });

  test('a cooled-down pair is never returned, but its venues stay matchable (no freeze)', () => {
    const venues = [{ id: 'v1' }, { id: 'v2' }, { id: 'v3' }];
    const pair = nextComparison({
      venues,
      comparisons: [],
      cooldownPairs: [['v1', 'v2']],
    });
    expect(pair).not.toBeNull();
    expect(sameUnorderedPair(pair, 'v1', 'v2')).toBe(false); // the cooled pair never comes back
  });

  test('two venues whose only pair is cooled returns null (stops, does not loop)', () => {
    const pair = nextComparison({
      venues: [{ id: 'v1' }, { id: 'v2' }],
      comparisons: [],
      cooldownPairs: [['v2', 'v1']], // order-insensitive
    });
    expect(pair).toBeNull();
  });

  test('information gain targets the uncertain venue over a settled matchup', () => {
    // v1 vs v2 is heavily compared and lopsided (confident, low info);
    // v3 is fresh (high variance) → the most informative pair must involve v3.
    const venues = [{ id: 'v1' }, { id: 'v2' }, { id: 'v3' }];
    const comparisons = [
      { a: 'v1', b: 'v2', result: 'v1' },
      { a: 'v1', b: 'v2', result: 'v1' },
      { a: 'v1', b: 'v2', result: 'v1' },
      { a: 'v1', b: 'v2', result: 'v1' },
      { a: 'v1', b: 'v2', result: 'v1' },
    ];
    const pair = nextComparison({ venues, comparisons });
    expect(pair).toContain('v3');
  });

  test('stopping rule: when every venue is already placed, returns null', () => {
    // Posterior variance is at most the prior (≈1); a huge target marks all placed.
    const venues = [{ id: 'v1' }, { id: 'v2' }, { id: 'v3' }];
    const pair = nextComparison({ venues, comparisons: [], varianceTarget: 100 });
    expect(pair).toBeNull();
  });
});
