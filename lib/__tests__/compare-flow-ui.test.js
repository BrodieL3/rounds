const fs = require('fs');
const path = require('path');

function read(...segments) {
  return fs.readFileSync(path.join(__dirname, '..', '..', ...segments), 'utf8');
}

// F3 final slice (parent ISA ISC-20): the pairwise comparison flow must be
// reachable and must feed the ADR 010 per-user BT stack ranking engine,
// including the "Too Tough" escape hatch. Source-contract style.

describe('Compare flow — feeds the per-user Bradley-Terry ranking engine (ADR 010)', () => {
  const source = read('app', 'compare.js');

  test('selects via the info-gain duel selector and ranks via the BT stack helper', () => {
    // ADR 010: the Elo position engine + binary-search selector are retired.
    expect(source).toContain("from '../lib/duel-select'");
    expect(source).toContain('nextComparison');
    expect(source).toContain("from '../lib/personal-rankings'");
    expect(source).toContain('buildStackRankings');
    expect(source).toContain('normalizeComparison');
    expect(source).not.toContain("from '../lib/ranking'");
    expect(source).not.toContain('computeRankings');
    expect(source).not.toContain("from '../lib/compare-select'");
  });

  test('cools a too-tough PAIR instead of freezing a venue (Defect 2)', () => {
    expect(source).toContain('cooldownPairs');
  });

  test('persists each decision to the canonical comparisons store the ranking reads', () => {
    expect(source).toContain("collection(db, 'comparisons')");
    expect(source).toContain("where('userId', '==', user.uid)");
    expect(source).toContain('result');
  });

  test('keeps the "Too tough" escape hatch wired to the canonical too-tough result', () => {
    expect(source).toContain('Too tough');
    expect(source).toContain("'too-tough'");
  });

  test('writes the comparison under its cohort so cross-cohort pairs never mix', () => {
    expect(source).toContain('cohort');
  });
});

describe('Compare flow — reachable entry points (ISC-20)', () => {
  test('is reachable from the post-log confirmation after enough ratings exist', () => {
    const rate = read('app', 'venue', '[id]', 'rate.js');
    expect(rate).toContain("router.push('/compare')");
  });

  test('is reachable from My List so the user can rank without re-logging', () => {
    const list = read('app', '(tabs)', 'list.js');
    expect(list).toContain("'/compare'");
  });
});

// Regression: Compare gated on `profile.city`, a field nothing ever writes
// (onboarding + seed omit it; ADR 007 says metro is the lens, not a user field),
// so loadData never ran and the screen was stuck on "Loading…" for every user.
describe('Compare flow — resolves venues by the metro lens, not a phantom profile.city', () => {
  const source = read('app', 'compare.js');

  test('resolves the cohort venue set across the metro lens, like My List (ADR 007)', () => {
    expect(source).toContain('getMetroCities');
    expect(source).toContain('DEFAULT_METRO');
  });

  test('does not gate the screen on a profile.city that is never written', () => {
    expect(source).not.toContain('profile.city');
    expect(source).not.toContain('profile?.city');
  });
});
