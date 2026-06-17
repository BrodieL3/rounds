const fs = require('fs');
const path = require('path');

function read(...segments) {
  return fs.readFileSync(path.join(__dirname, '..', '..', ...segments), 'utf8');
}

// F3 final slice (parent ISA ISC-17/18/19/20/54/55): the payoff screen.
// `app/(tabs)/list.js` becomes MY LIST — a running history of the user's own
// logs PLUS a ranked area that stays locked ("rank unlocks at 5 visits") until
// the 5th log, then reveals the personal ranked list via the EXISTING Elo.
// Source-contract style (no JSX transform), matching profile-ranking-ui /
// log-visit-loop-ui.

describe('My List — reads the user\'s own logs through the canonical path', () => {
  const source = read('app', '(tabs)', 'list.js');

  test('queries the user\'s own ratings (the canonical opinion store, ADR 005)', () => {
    expect(source).toContain("collection(db, 'ratings')");
    expect(source).toContain("where('userId', '==', user.uid)");
  });

  test('builds the visit history through the pure my-list engine (ISC-17)', () => {
    expect(source).toContain("from '../../lib/my-list'");
    expect(source).toContain('buildVisitHistory');
  });

  test('reloads when the tab regains focus so a fresh log shows up immediately', () => {
    expect(source).toContain('useFocusEffect');
  });

  test('renders the chosen sentiment per logged bar (loved / fine / disliked record)', () => {
    // The history rows surface the human sentiment label from the engine.
    expect(source).toContain('sentimentLabel');
  });
});

describe('My List — rank-unlock-at-5 gate (ISC-18/19)', () => {
  const source = read('app', '(tabs)', 'list.js');

  test('drives the gate from the pure unlock-state engine, not an ad-hoc inline count', () => {
    expect(source).toContain('getRankUnlockState');
  });

  test('shows the locked promise copy and a progress hint while under 5 logs', () => {
    expect(source).toContain('rank unlocks at 5 visits');
    // The "N of 5" pull-forward hint comes straight from the engine.
    expect(source).toContain('progressLabel');
  });

  test('only reveals the ranked list when unlocked (the Elo list is gated behind unlocked)', () => {
    expect(source).toContain('unlocked');
    // The ranked list is built from the EXISTING Elo engine — not reinvented.
    expect(source).toContain('buildStackRankings');
    expect(source).toContain("from '../../lib/personal-rankings'");
  });

  test('renders the unlocked ranked rows with the shared ranked VenueRow', () => {
    expect(source).toContain("import VenueRow from '../../components/VenueRow'");
    expect(source).toContain('actionMode="ranked"');
  });
});

describe('My List — empty / guided first-session state (ISC-54/55)', () => {
  const source = read('app', '(tabs)', 'list.js');

  test('nudges a zero-log user toward logging their first bar (not a dead feed)', () => {
    // Empty-state copy must point the user at the find/log action.
    expect(source).toMatch(/[Ll]og your first/);
  });

  test('gives the empty state a way into the browse/find surface', () => {
    // A CTA routes the new user to where bars can be found and logged.
    expect(source).toContain('router.push');
  });
});

describe('My List — wires the pairwise comparison entry point (ISC-20)', () => {
  const source = read('app', '(tabs)', 'list.js');

  test('exposes a reachable route into the comparison flow that feeds the ranking', () => {
    expect(source).toContain("'/compare'");
  });
});
