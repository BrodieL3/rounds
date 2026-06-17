const fs = require('fs');
const path = require('path');

function read(...segments) {
  return fs.readFileSync(path.join(__dirname, '..', '..', ...segments), 'utf8');
}
function exists(...segments) {
  return fs.existsSync(path.join(__dirname, '..', '..', ...segments));
}

describe('onboarding screen (ISC-16..18)', () => {
  test('app/onboarding.js exists', () => {
    expect(exists('app', 'onboarding.js')).toBe(true);
  });

  const source = exists('app', 'onboarding.js') ? read('app', 'onboarding.js') : '';

  test('uses AuthContext (needs the signed-in user + reloadProfile)', () => {
    expect(source).toContain('useAuth');
  });

  test('exposes stable testIDs for dob, displayName, username, submit, and the under-18 block', () => {
    expect(source).toContain('testID="onboarding-dob-input"');
    expect(source).toContain('testID="onboarding-displayName-input"');
    expect(source).toContain('testID="onboarding-username-input"');
    expect(source).toContain('testID="onboarding-submit"');
    expect(source).toContain('testID="onboarding-error"');
  });

  test('delegates age/validation + persistence to the shared lib/onboarding helpers (no inline age math)', () => {
    expect(source).toContain("from '../lib/onboarding'");
    expect(source).toContain('persistOnboarding');
    // the screen must not hand-roll the year subtraction
    expect(source).not.toMatch(/getFullYear\(\)\s*-/);
  });

  test('on success it navigates into the app; under-18/invalid stays on the screen', () => {
    expect(source).toContain("router.replace('/(tabs)/friends')");
    // success is gated on the helper result, not unconditional
    expect(source).toMatch(/if\s*\(\s*res(ult)?\.ok\s*\)/);
  });

  test('uses the shared COLORS tokens', () => {
    expect(source).toContain("from '../lib/constants'");
    expect(source).toContain('COLORS');
  });
});

describe('index routing wiring (ISC-14)', () => {
  const source = read('app', 'index.js');

  test('consumes auth state including isOnboarded', () => {
    expect(source).toContain('useAuth');
    expect(source).toContain('isOnboarded');
  });

  test('routes via the shared resolveRoute resolver', () => {
    expect(source).toContain("from '../lib/auth-routing'");
    expect(source).toContain('resolveRoute');
  });

  test('navigates to the resolver result', () => {
    expect(source).toMatch(/router\.replace\(\s*\w+\s*\)/);
  });
});

describe('signup routes new accounts to onboarding (ISC-15)', () => {
  const source = read('app', 'signup.js');

  test('a fresh signup goes to /onboarding, not straight to the tabs', () => {
    expect(source).toContain("router.replace('/onboarding')");
    expect(source).not.toContain("router.replace('/(tabs)/friends')");
  });
});
