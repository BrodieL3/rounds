const { tonightWindow, isWithinTonight } = require('../events/tonight-window');

// Mid-evening — well clear of the 4am cutoff in both UTC and US/Eastern, so the
// assertions hold regardless of the machine timezone the test runs in.
const NOW = new Date('2026-07-01T20:00:00.000Z');
const hoursFromNow = (h) => new Date(NOW.getTime() + h * 3600e3).toISOString();

describe('tonightWindow', () => {
  test('starts at now and ends at the next late-night cutoff (in the future)', () => {
    const w = tonightWindow(NOW);
    expect(w.startISO).toBe(NOW.toISOString());
    expect(new Date(w.endISO).getTime()).toBeGreaterThan(NOW.getTime());
  });
});

describe('isWithinTonight', () => {
  test('an event later tonight is within the window', () => {
    expect(isWithinTonight(hoursFromNow(1), NOW)).toBe(true);
  });

  test('an event that already started is excluded — the feed shows what is still upcoming', () => {
    expect(isWithinTonight(hoursFromNow(-1), NOW)).toBe(false);
  });

  test('an event two days out is excluded', () => {
    expect(isWithinTonight(hoursFromNow(48), NOW)).toBe(false);
  });
});
