const { nextComparison, nextOpponentFor, decisiveCounts } = require('../compare-select');

// peers pre-sorted worst → best (as nextComparison hands them in)
const PEERS = ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6'].map((id, i) => ({ id, rating: 1000 + i }));

describe('decisiveCounts', () => {
  test('counts decisive comparisons per venue and ignores too-tough', () => {
    const counts = decisiveCounts([
      { a: 'x', b: 'y', result: 'x' },
      { a: 'x', b: 'z', result: 'too-tough' },
    ]);
    expect(counts.x).toBe(1);
    expect(counts.y).toBe(1);
    expect(counts.z).toBeUndefined();
  });
});

describe('nextOpponentFor — binary insertion (ADR 008 §2)', () => {
  test('first comparison is the median peer', () => {
    expect(nextOpponentFor('t', PEERS, [])).toBe('p3'); // floor(7/2) = 3
  });

  test('after target beats the median, it searches the upper half', () => {
    const opp = nextOpponentFor('t', PEERS, [{ a: 't', b: 'p3', result: 't' }]);
    // lo=4, hi=7 → mid=5
    expect(opp).toBe('p5');
  });

  test('after target loses to the median, it searches the lower half', () => {
    const opp = nextOpponentFor('t', PEERS, [{ a: 't', b: 'p3', result: 'p3' }]);
    // lo=0, hi=3 → mid=1
    expect(opp).toBe('p1');
  });

  test('returns null once the interval collapses (placed)', () => {
    const placed = nextOpponentFor('t', PEERS, [
      { a: 't', b: 'p3', result: 't' }, // above p3 → lo=4
      { a: 't', b: 'p4', result: 'p4' }, // below p4 → hi=4
    ]);
    expect(placed).toBeNull();
  });

  test('a too-tough freezes placement (insert adjacent, stop)', () => {
    expect(nextOpponentFor('t', PEERS, [{ a: 't', b: 'p3', result: 'too-tough' }])).toBeNull();
  });

  test('converges in <= ceil(log2(n)) comparisons', () => {
    const truePos = 4; // target ranks above p0..p3, below p4..p6
    let comps = [];
    let steps = 0;
    while (steps < 10) {
      const opp = nextOpponentFor('t', PEERS, comps);
      if (!opp) break;
      const oppIdx = PEERS.findIndex((p) => p.id === opp);
      const targetWon = oppIdx < truePos;
      comps.push({ a: 't', b: opp, result: targetWon ? 't' : opp });
      steps += 1;
    }
    expect(steps).toBeLessThanOrEqual(Math.ceil(Math.log2(PEERS.length))); // 3
  });
});

describe('nextComparison — pair selection', () => {
  const venues = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  test('returns null with fewer than two venues', () => {
    expect(nextComparison({ venues: [{ id: 'a' }] })).toBeNull();
    expect(nextComparison({ venues: [] })).toBeNull();
  });

  test('returns a distinct pair drawn from the venue set', () => {
    const pair = nextComparison({ venues, comparisons: [] });
    expect(pair).toHaveLength(2);
    expect(pair[0]).not.toBe(pair[1]);
    expect(venues.map((v) => v.id)).toEqual(expect.arrayContaining(pair));
  });

  test('only pairs venues within the same sentiment band', () => {
    const banded = [{ id: 'L1' }, { id: 'L2' }, { id: 'F1' }];
    const sentimentByVenue = { L1: 'loved', L2: 'loved', F1: 'fine' };
    const pair = nextComparison({ venues: banded, comparisons: [], sentimentByVenue });
    const band = (id) => sentimentByVenue[id];
    expect(band(pair[0])).toBe(band(pair[1]));
  });

  test('terminates (returns null) once a small cohort is fully placed', () => {
    const cohort = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
    const trueRank = { a: 4, b: 3, c: 2, d: 1 }; // a best … d worst
    let comparisons = [];
    let guard = 0;
    let pair = nextComparison({ venues: cohort, comparisons });
    while (pair && guard < 100) {
      const [x, y] = pair;
      const result = trueRank[x] > trueRank[y] ? x : y;
      comparisons.push({ a: x, b: y, result });
      pair = nextComparison({ venues: cohort, comparisons });
      guard += 1;
    }
    expect(pair).toBeNull();
    expect(guard).toBeLessThan(cohort.length * (cohort.length - 1)); // beats all-pairs O(n^2)
  });
});
