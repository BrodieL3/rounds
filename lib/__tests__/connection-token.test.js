const { mintToken, isResolvable, markConsumed } = require('../proximity/connection-token');

const NOW = new Date('2026-07-01T20:00:00.000Z');
const MIN = 60 * 1000;

describe('connection-token', () => {
  test('mints an unguessable hex token with uid + ttl', () => {
    const t = mintToken({ uid: 'u1', now: NOW, ttlMinutes: 3 });
    expect(t.token).toMatch(/^[0-9a-f]{48}$/); // 24 bytes → 48 hex chars
    expect(t.uid).toBe('u1');
    expect(t.consumed).toBe(false);
    expect(t.expiresAt).toBe(new Date(NOW.getTime() + 3 * MIN).toISOString());
  });

  test('two mints produce different tokens', () => {
    expect(mintToken({ uid: 'u1' }).token).not.toBe(mintToken({ uid: 'u1' }).token);
  });

  test('requires a uid', () => {
    expect(() => mintToken({})).toThrow(/uid/);
  });

  test('resolvable within the ttl, not after', () => {
    const t = mintToken({ uid: 'u1', now: NOW, ttlMinutes: 3 });
    expect(isResolvable(t, new Date(NOW.getTime() + 2 * MIN))).toBe(true);
    expect(isResolvable(t, new Date(NOW.getTime() + 4 * MIN))).toBe(false);
  });

  test('a consumed token is never resolvable (single-use)', () => {
    const t = mintToken({ uid: 'u1', now: NOW });
    expect(isResolvable(markConsumed(t), NOW)).toBe(false);
  });
});
