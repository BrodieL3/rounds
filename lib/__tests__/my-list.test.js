const {
  RANK_UNLOCK_THRESHOLD,
  buildVisitHistory,
  getLogCount,
  getRankUnlockState,
  SENTIMENT_HISTORY_LABELS,
} = require('../my-list');

// F3 final slice (parent ISA ISC-17/18/19/54/55): the payoff.
// `lib/my-list.js` is the pure, UI-free engine for the My List tab —
// it turns the user's OWN ratings (read via rating-service / Firestore)
// into a scannable visit history, and computes the rank-unlock-at-5 gate.
// Kept free of React/Firebase so it runs in the repo's node test env
// (matching log-visit.js, venue-catalog.js, personal-rankings.js).

describe('my-list — sentiment history labels', () => {
  test('exposes a human label for each canonical sentiment (loved / fine / disliked)', () => {
    expect(SENTIMENT_HISTORY_LABELS).toEqual({
      loved: 'Loved it',
      fine: 'It was fine',
      disliked: "Didn't like it",
    });
  });
});

describe('my-list — getLogCount', () => {
  test('counts a list of logged ratings', () => {
    expect(getLogCount([{ venueId: 'a' }, { venueId: 'b' }, { venueId: 'c' }])).toBe(3);
  });

  test('is zero for an empty or missing list (zero-log first session)', () => {
    expect(getLogCount([])).toBe(0);
    expect(getLogCount(undefined)).toBe(0);
    expect(getLogCount(null)).toBe(0);
  });
});

describe('my-list — buildVisitHistory', () => {
  const ratings = [
    { venueId: 'a', venueName: 'Alpha', cohort: 'cocktail_bar', sentiment: 'loved', createdAt: { seconds: 100 } },
    { venueId: 'b', venueName: 'Beta', cohort: 'wine_bar', sentiment: 'fine', createdAt: { seconds: 300 } },
    { venueId: 'c', venueName: 'Gamma', cohort: 'pub', sentiment: 'disliked', createdAt: { seconds: 200 } },
  ];

  test('returns one history entry per rating, most-recent-first', () => {
    const history = buildVisitHistory(ratings);
    expect(history.map((h) => h.venueId)).toEqual(['b', 'c', 'a']);
  });

  test('decorates each entry with a human sentiment label and stable key', () => {
    const history = buildVisitHistory(ratings);
    const beta = history.find((h) => h.venueId === 'b');
    expect(beta.sentimentLabel).toBe('It was fine');
    expect(beta.venueName).toBe('Beta');
    expect(beta.cohort).toBe('wine_bar');
    expect(typeof beta.key).toBe('string');
    expect(beta.key.length).toBeGreaterThan(0);
  });

  test('collapses repeat logs of the SAME venue to a single latest entry (ISC-23: no duplicate identity)', () => {
    const repeat = [
      { venueId: 'a', venueName: 'Alpha', cohort: 'cocktail_bar', sentiment: 'fine', createdAt: { seconds: 100 } },
      { venueId: 'a', venueName: 'Alpha', cohort: 'cocktail_bar', sentiment: 'loved', createdAt: { seconds: 400 } },
      { venueId: 'b', venueName: 'Beta', cohort: 'wine_bar', sentiment: 'fine', createdAt: { seconds: 200 } },
    ];
    const history = buildVisitHistory(repeat);
    expect(history.map((h) => h.venueId)).toEqual(['a', 'b']);
    // The surviving Alpha entry reflects the LATEST sentiment, not the first.
    const alpha = history.find((h) => h.venueId === 'a');
    expect(alpha.sentiment).toBe('loved');
    expect(alpha.visitCount).toBe(2);
  });

  test('reports a single visitCount of 1 for venues logged once', () => {
    const history = buildVisitHistory(ratings);
    expect(history.every((h) => h.visitCount === 1)).toBe(true);
  });

  test('handles serverTimestamp pending writes (null createdAt) without crashing or losing the entry', () => {
    const pending = [
      { venueId: 'a', venueName: 'Alpha', cohort: 'cocktail_bar', sentiment: 'loved', createdAt: null },
      { venueId: 'b', venueName: 'Beta', cohort: 'wine_bar', sentiment: 'fine', createdAt: { seconds: 200 } },
    ];
    const history = buildVisitHistory(pending);
    expect(history).toHaveLength(2);
    expect(history.map((h) => h.venueId)).toContain('a');
  });

  test('accepts millisecond-number and Firestore Timestamp createdAt shapes', () => {
    const mixed = [
      { venueId: 'a', venueName: 'Alpha', cohort: 'pub', sentiment: 'loved', createdAt: 1000 },
      { venueId: 'b', venueName: 'Beta', cohort: 'pub', sentiment: 'fine', createdAt: { toMillis: () => 5000 } },
    ];
    const history = buildVisitHistory(mixed);
    expect(history.map((h) => h.venueId)).toEqual(['b', 'a']);
  });

  test('never throws on empty / missing input — returns an empty history', () => {
    expect(buildVisitHistory([])).toEqual([]);
    expect(buildVisitHistory(undefined)).toEqual([]);
    expect(buildVisitHistory(null)).toEqual([]);
  });

  test('ignores malformed rows that lack a venueId rather than rendering a ghost entry', () => {
    const dirty = [
      { venueName: 'No Id', sentiment: 'loved' },
      { venueId: 'b', venueName: 'Beta', cohort: 'wine_bar', sentiment: 'fine', createdAt: { seconds: 200 } },
    ];
    const history = buildVisitHistory(dirty);
    expect(history.map((h) => h.venueId)).toEqual(['b']);
  });
});

describe('my-list — getRankUnlockState (rank-unlocks-at-5)', () => {
  test('exports the canonical threshold of 5 (ISC-18/19)', () => {
    expect(RANK_UNLOCK_THRESHOLD).toBe(5);
  });

  test('stays LOCKED below the threshold and reports remaining + progress', () => {
    const state = getRankUnlockState(3);
    expect(state.unlocked).toBe(false);
    expect(state.logCount).toBe(3);
    expect(state.remaining).toBe(2);
    expect(state.threshold).toBe(5);
    expect(state.progressLabel).toBe('3 of 5');
  });

  test('is locked at zero logs with the full distance remaining', () => {
    const state = getRankUnlockState(0);
    expect(state.unlocked).toBe(false);
    expect(state.remaining).toBe(5);
    expect(state.progressLabel).toBe('0 of 5');
  });

  test('UNLOCKS exactly at the threshold (N === 5)', () => {
    const state = getRankUnlockState(5);
    expect(state.unlocked).toBe(true);
    expect(state.remaining).toBe(0);
    expect(state.progressLabel).toBe('5 of 5');
  });

  test('stays unlocked above the threshold and never reports negative remaining', () => {
    const state = getRankUnlockState(9);
    expect(state.unlocked).toBe(true);
    expect(state.remaining).toBe(0);
  });

  test('treats missing / invalid counts as zero (locked) rather than throwing', () => {
    expect(getRankUnlockState(undefined).unlocked).toBe(false);
    expect(getRankUnlockState(undefined).remaining).toBe(5);
    expect(getRankUnlockState(-2).logCount).toBe(0);
    expect(getRankUnlockState(NaN).unlocked).toBe(false);
  });

  test('honors a custom threshold override (keeps the magic number injectable for tests/tuning)', () => {
    const state = getRankUnlockState(2, 3);
    expect(state.threshold).toBe(3);
    expect(state.unlocked).toBe(false);
    expect(state.remaining).toBe(1);
    expect(state.progressLabel).toBe('2 of 3');
  });
});
