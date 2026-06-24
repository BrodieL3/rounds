const { BAND_WINDOWS, toDisplayScore, assignDisplayScores } = require('../scoring');

describe('toDisplayScore — band window + percentile (ADR 008 §3)', () => {
  test('maps percentile into each band window', () => {
    expect(toDisplayScore('loved', 1)).toBe(10);
    expect(toDisplayScore('loved', 0)).toBe(7);
    expect(toDisplayScore('fine', 0)).toBe(5);
    expect(toDisplayScore('fine', 1)).toBe(6.9);
    expect(toDisplayScore('disliked', 0)).toBe(0);
    expect(toDisplayScore('disliked', 1)).toBe(4.9);
  });

  test('clamps percentile to [0,1]', () => {
    expect(toDisplayScore('loved', 2)).toBe(10);
    expect(toDisplayScore('loved', -1)).toBe(7);
  });

  test('unknown band maps across the full 0–10 range', () => {
    expect(toDisplayScore(null, 0)).toBe(0);
    expect(toDisplayScore(null, 1)).toBe(10);
  });

  test('band windows are ordered loved > fine > disliked and non-overlapping', () => {
    expect(BAND_WINDOWS.loved[0]).toBeGreaterThan(BAND_WINDOWS.fine[1]);
    expect(BAND_WINDOWS.fine[0]).toBeGreaterThan(BAND_WINDOWS.disliked[1]);
  });
});

describe('assignDisplayScores — hard band clamp (the sentiment promise)', () => {
  const venues = [
    { id: 'L1', rating: 1500 },
    { id: 'L2', rating: 1700 },
    { id: 'F1', rating: 2000 }, // huge Elo but only 'fine' → must clamp below loved
    { id: 'D1', rating: 1400 },
  ];
  const sentiment = { L1: 'loved', L2: 'loved', F1: 'fine', D1: 'disliked' };
  const byId = Object.fromEntries(
    assignDisplayScores(venues, sentiment).map((v) => [v.id, v.displayScore]),
  );

  test('every loved score >= every fine score regardless of raw Elo', () => {
    expect(Math.min(byId.L1, byId.L2)).toBeGreaterThanOrEqual(byId.F1);
  });

  test('within a band, higher Elo gets the higher score', () => {
    expect(byId.L2).toBeGreaterThan(byId.L1);
    expect(byId.L2).toBe(10); // best loved
    expect(byId.L1).toBe(7); // worst loved
  });

  test('a lone fine venue tops its window despite a huge Elo (clamped)', () => {
    expect(byId.F1).toBe(6.9);
  });

  test('disliked always renders under 5', () => {
    expect(byId.D1).toBeLessThan(5);
  });

  test('venues without sentiment still get a score', () => {
    const scored = assignDisplayScores([{ id: 'x', rating: 1500 }], {});
    expect(typeof scored[0].displayScore).toBe('number');
  });
});
