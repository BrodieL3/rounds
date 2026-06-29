const { localDateOf } = require('../events/event-date');

describe('localDateOf', () => {
  test('formats a Date as YYYY-MM-DD in local time', () => {
    // Constructed from local components → unambiguous across timezones.
    expect(localDateOf(new Date(2026, 6, 1, 20, 0, 0))).toBe('2026-07-01'); // month is 0-indexed
  });

  test('accepts a timestamp/ISO string', () => {
    expect(localDateOf(new Date(2026, 0, 5).toISOString())).toBe('2026-01-05');
  });

  test('throws on an invalid date', () => {
    expect(() => localDateOf('not-a-date')).toThrow(/invalid/);
  });
});
