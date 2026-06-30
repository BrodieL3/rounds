// Behavioral contract for the per-user Bayesian Bradley-Terry engine (ADR 010 §1/§2).
// These tests assert PROPERTIES (ordering, clamping direction, variance/decay
// direction, lower-bound burial) — never exact posterior numbers, which are tuning
// detail. Interface under test:
//
//   fit(venues, comparisons, options) -> { [venueId]: { mean, variance, comparisons } }
//     venues:      [{ id, ... }]
//     comparisons: [{ a, b, result, createdAt?, context? }]  result ∈ {aId, bId, 'too-tough'}
//     options:
//       priorBySentiment: { [venueId]: 'loved'|'fine'|'disliked' } | (venue)=>sentiment
//       recencyHalfLife:  number (ms) — with `now`, exponentially down-weights old comparisons
//       now:              number (ms epoch) — reference time for recency
//       contextWeights:   { [context]: weight } — unknown contexts default to 1
//   lowerBound({ mean, variance }, k) -> number   // mean - k*sqrt(variance)
//   SENTIMENT_PRIOR: { loved, fine, disliked }    // prior-mean offsets, loved > fine > disliked

const { fit, lowerBound, SENTIMENT_PRIOR } = require('../ranking-bt');

const venues = [
  { id: 'v1', name: 'The Nocturne' },
  { id: 'v2', name: 'Velvet Room' },
  { id: 'v3', name: 'Midnight Orchard' },
];

const meanGap = (post, a, b) => post[a].mean - post[b].mean;

describe('ranking-bt fit()', () => {
  test('returns a posterior for every venue, including uncompared ones', () => {
    const post = fit(venues, [{ a: 'v1', b: 'v2', result: 'v1' }]);
    expect(Object.keys(post).sort()).toEqual(['v1', 'v2', 'v3']);
    expect(post.v3).toBeDefined();          // uncompared venue still gets a posterior
    expect(typeof post.v3.mean).toBe('number');
    expect(typeof post.v3.variance).toBe('number');
  });

  test('with no comparisons, posterior means follow the sentiment prior', () => {
    const post = fit(venues, [], {
      priorBySentiment: { v1: 'loved', v2: 'fine', v3: 'disliked' },
    });
    expect(post.v1.mean).toBeGreaterThan(post.v2.mean);
    expect(post.v2.mean).toBeGreaterThan(post.v3.mean);
  });

  test('a decisive comparison puts the winner above the loser', () => {
    const post = fit(venues, [{ a: 'v1', b: 'v2', result: 'v1' }]);
    expect(post.v1.mean).toBeGreaterThan(post.v2.mean);
  });

  test('too-tough is a draw that closes the gap but does not flip it (ADR 010 §1)', () => {
    const decisiveOnly = fit(venues, [{ a: 'v1', b: 'v2', result: 'v1' }]);
    const withDraw = fit(venues, [
      { a: 'v1', b: 'v2', result: 'v1' },
      { a: 'v1', b: 'v2', result: 'too-tough' },
    ]);
    expect(meanGap(withDraw, 'v1', 'v2')).toBeGreaterThan(0);                       // still ahead
    expect(meanGap(withDraw, 'v1', 'v2')).toBeLessThan(meanGap(decisiveOnly, 'v1', 'v2')); // gap closed
  });

  test('variance shrinks monotonically as a venue accrues comparisons', () => {
    const none = fit(venues, []);
    const one = fit(venues, [{ a: 'v1', b: 'v2', result: 'v1' }]);
    const many = fit(venues, [
      { a: 'v1', b: 'v2', result: 'v1' },
      { a: 'v1', b: 'v3', result: 'v1' },
      { a: 'v1', b: 'v2', result: 'v1' },
      { a: 'v1', b: 'v3', result: 'v1' },
    ]);
    expect(one.v1.variance).toBeLessThan(none.v1.variance);
    expect(many.v1.variance).toBeLessThan(one.v1.variance);
  });

  test('lower bound buries an under-compared venue beneath a well-compared one (ADR 010 §2)', () => {
    // v1 wins five times (confident); v3 has a single lucky win (high uncertainty).
    const comparisons = [
      { a: 'v1', b: 'v2', result: 'v1' },
      { a: 'v1', b: 'v2', result: 'v1' },
      { a: 'v1', b: 'v2', result: 'v1' },
      { a: 'v1', b: 'v2', result: 'v1' },
      { a: 'v1', b: 'v2', result: 'v1' },
      { a: 'v3', b: 'v2', result: 'v3' },
    ];
    const post = fit(venues, comparisons);
    expect(post.v3.variance).toBeGreaterThan(post.v1.variance);
    expect(lowerBound(post.v3, 2)).toBeLessThan(lowerBound(post.v1, 2));
  });

  test('recency-weighting: a stale win moves the mean less than a fresh one', () => {
    const now = 1_000_000_000_000;
    const day = 86_400_000;
    const opts = { recencyHalfLife: 90 * day, now };
    const fresh = fit(venues, [{ a: 'v1', b: 'v2', result: 'v1', createdAt: now - day }], opts);
    const stale = fit(venues, [{ a: 'v1', b: 'v2', result: 'v1', createdAt: now - 400 * day }], opts);
    expect(meanGap(fresh, 'v1', 'v2')).toBeGreaterThan(meanGap(stale, 'v1', 'v2'));
    expect(meanGap(stale, 'v1', 'v2')).toBeGreaterThan(0);
  });

  test('context weighting: a tonight-decision tap moves the mean less than a full-weight tap (ADR 010 §5)', () => {
    const opts = { contextWeights: { 'tonight-decision': 0.25 } };
    const full = fit(venues, [{ a: 'v1', b: 'v2', result: 'v1', context: 'pairwise' }], opts);
    const tonight = fit(venues, [{ a: 'v1', b: 'v2', result: 'v1', context: 'tonight-decision' }], opts);
    expect(meanGap(full, 'v1', 'v2')).toBeGreaterThan(meanGap(tonight, 'v1', 'v2'));
    expect(meanGap(tonight, 'v1', 'v2')).toBeGreaterThan(0);
  });

  test('recovers a clean transitive order a > b > c > d', () => {
    const batch = [
      { id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' },
    ];
    const comparisons = [
      { a: 'a', b: 'b', result: 'a' },
      { a: 'a', b: 'c', result: 'a' },
      { a: 'a', b: 'd', result: 'a' },
      { a: 'b', b: 'c', result: 'b' },
      { a: 'b', b: 'd', result: 'b' },
      { a: 'c', b: 'd', result: 'c' },
    ];
    const post = fit(batch, comparisons);
    const order = ['a', 'b', 'c', 'd']
      .slice()
      .sort((x, y) => post[y].mean - post[x].mean);
    expect(order).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('ranking-bt lowerBound()', () => {
  test('computes mean - k*sqrt(variance)', () => {
    expect(lowerBound({ mean: 10, variance: 4 }, 3)).toBeCloseTo(4);
    expect(lowerBound({ mean: 5, variance: 0 }, 2)).toBeCloseTo(5);
  });

  test('higher variance produces a lower conservative bound at equal mean', () => {
    expect(lowerBound({ mean: 10, variance: 9 }, 1))
      .toBeLessThan(lowerBound({ mean: 10, variance: 1 }, 1));
  });
});

describe('ranking-bt SENTIMENT_PRIOR', () => {
  test('prior offsets are ordered loved > fine > disliked', () => {
    expect(SENTIMENT_PRIOR.loved).toBeGreaterThan(SENTIMENT_PRIOR.fine);
    expect(SENTIMENT_PRIOR.fine).toBeGreaterThan(SENTIMENT_PRIOR.disliked);
  });
});
