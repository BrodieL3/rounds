const { buildPresence, isExpired, visiblePresence } = require('../checkin/presence');

const NOW = new Date('2026-07-01T20:00:00.000Z');
const HOUR = 3600 * 1000;
const after = (h) => new Date(NOW.getTime() + h * HOUR);

describe('buildPresence', () => {
  test('sets checkedInAt=now and expiresAt=now+ttl', () => {
    const p = buildPresence({ uid: 'u1', venueId: 'v1', now: NOW, ttlHours: 4 });
    expect(p.checkedInAt).toBe(NOW.toISOString());
    expect(p.expiresAt).toBe(after(4).toISOString());
    expect(p.ghost).toBe(false);
  });

  test('requires uid and venueId', () => {
    expect(() => buildPresence({ venueId: 'v1', now: NOW })).toThrow(/uid/);
    expect(() => buildPresence({ uid: 'u1', now: NOW })).toThrow(/venueId/);
  });
});

describe('isExpired', () => {
  const p = buildPresence({ uid: 'u1', venueId: 'v1', now: NOW, ttlHours: 4 });
  test('false before the TTL, true after', () => {
    expect(isExpired(p, after(1))).toBe(false);
    expect(isExpired(p, after(5))).toBe(true);
  });
});

describe('visiblePresence', () => {
  const mk = (uid, ghost = false) => buildPresence({ uid, venueId: 'v1', now: NOW, ghost });

  test('shows other non-ghost, non-blocked, non-expired users only', () => {
    const list = [mk('alice'), mk('bob'), mk('carol', true), mk('viewer')];
    const out = visiblePresence(list, 'viewer', { blockedUids: ['bob'], now: after(1) });
    expect(out.map((p) => p.uid)).toEqual(['alice']); // bob blocked, carol ghost, viewer is self
  });

  test('hides everyone once the TTL has passed', () => {
    const out = visiblePresence([mk('alice'), mk('bob')], 'viewer', { now: after(5) });
    expect(out).toEqual([]);
  });
});
