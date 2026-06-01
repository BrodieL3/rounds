const { resolveRoute } = require('../auth-routing');

describe('resolveRoute', () => {
  test('loading → null', () => {
    expect(resolveRoute({ loading: true, user: null, isOnboarded: false })).toBeNull();
  });

  test('no user → /welcome', () => {
    expect(resolveRoute({ loading: false, user: null, isOnboarded: false })).toBe('/welcome');
  });

  test('user + not onboarded → /onboarding/phone', () => {
    expect(resolveRoute({ loading: false, user: { uid: '1' }, isOnboarded: false })).toBe('/onboarding/phone');
  });

  test('user + onboarded → /(tabs)/friends', () => {
    expect(resolveRoute({ loading: false, user: { uid: '1' }, isOnboarded: true })).toBe('/(tabs)/friends');
  });
});
