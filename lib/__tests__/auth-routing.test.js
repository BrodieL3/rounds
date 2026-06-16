const { resolveRoute } = require('../auth-routing');

describe('resolveRoute', () => {
  test('loading → null', () => {
    expect(resolveRoute({ loading: true, user: null, isOnboarded: false })).toBeNull();
  });

  test('no user → Friends shell for Figma UI pass', () => {
    expect(resolveRoute({ loading: false, user: null, isOnboarded: false })).toBe('/(tabs)/friends');
  });

  test('user + not onboarded → Friends shell because auth/onboarding frontend is out of scope', () => {
    expect(resolveRoute({ loading: false, user: { uid: '1' }, isOnboarded: false })).toBe('/(tabs)/friends');
  });

  test('user + onboarded → /(tabs)/friends', () => {
    expect(resolveRoute({ loading: false, user: { uid: '1' }, isOnboarded: true })).toBe('/(tabs)/friends');
  });
});
