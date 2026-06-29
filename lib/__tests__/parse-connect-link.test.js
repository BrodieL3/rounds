const { buildConnectLink, parseConnectLink } = require('../proximity/parse-connect-link');

describe('parse-connect-link', () => {
  test('round-trips a token through build/parse', () => {
    expect(parseConnectLink(buildConnectLink('abc123'))).toBe('abc123');
  });

  test('extracts the token, tolerating extra params', () => {
    expect(parseConnectLink('rounds://connect?token=deadbeef&v=2')).toBe('deadbeef');
  });

  test('returns null for a wrong scheme or path', () => {
    expect(parseConnectLink('https://rounds.app/connect?token=abc')).toBeNull();
    expect(parseConnectLink('rounds://friend?token=abc')).toBeNull();
  });

  test('returns null when the token is missing or malformed', () => {
    expect(parseConnectLink('rounds://connect?foo=bar')).toBeNull();
    expect(parseConnectLink('rounds://connect?token=not-hex!')).toBeNull();
  });

  test('returns null for non-string input', () => {
    expect(parseConnectLink(null)).toBeNull();
    expect(parseConnectLink(42)).toBeNull();
  });

  test('build requires a token', () => {
    expect(() => buildConnectLink()).toThrow(/token/);
  });
});
