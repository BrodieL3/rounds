const fs = require('fs');
const path = require('path');

function read(...segments) {
  return fs.readFileSync(path.join(__dirname, '..', '..', ...segments), 'utf8');
}

// F3 final slice (parent ISA ISC-20): the pairwise comparison flow must be
// reachable and must FEED the existing Elo ranking — reusing lib/ranking.js +
// lib/personal-rankings.js, including the "Too Tough" escape hatch
// (CONTEXT.md: ranking ignores too-tough). Source-contract style.

describe('Compare flow — feeds the EXISTING Elo ranking engine', () => {
  const source = read('app', 'compare.js');

  test('reuses the existing ranking engine rather than reinventing scoring', () => {
    expect(source).toContain("from '../lib/ranking'");
    expect(source).toContain('computeRankings');
    expect(source).toContain("from '../lib/personal-rankings'");
    expect(source).toContain('normalizeComparison');
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
