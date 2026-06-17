const { resolveRoute } = require('../auth-routing');

// Slice 2: index.js enforces the three auth/onboarding states.
// (Replaces the slice-1 "everything → friends" behavior, which was a
// deliberate Figma-pass placeholder now superseded by the on-ramp.)
describe('resolveRoute (ISC-10..13: auth/onboarding routing)', () => {
  test('loading → null (no navigation until auth resolves)', () => {
    expect(resolveRoute({ loading: true, user: null, isOnboarded: false })).toBeNull();
    expect(resolveRoute({ loading: true, user: { uid: '1' }, isOnboarded: true })).toBeNull();
  });

  test('signed-out → /login', () => {
    expect(resolveRoute({ loading: false, user: null, isOnboarded: false })).toBe('/login');
  });

  test('signed-in & NOT onboarded → /onboarding', () => {
    expect(resolveRoute({ loading: false, user: { uid: '1' }, isOnboarded: false })).toBe('/onboarding');
  });

  test('signed-in & onboarded → /(tabs)/friends', () => {
    expect(resolveRoute({ loading: false, user: { uid: '1' }, isOnboarded: true })).toBe('/(tabs)/friends');
  });
});
