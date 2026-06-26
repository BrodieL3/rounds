// Pure. Defines the "tonight" query window for the Discover feed: from now until
// the next late-night cutoff (default 4am local — matching P3's presence cutoff).
// startTime is stored as a fixed-format UTC ISO string, so lexicographic string
// comparison equals chronological comparison. Firebase-free.

function nextCutoff(now, hour) {
  const c = new Date(now);
  c.setHours(hour, 0, 0, 0);
  if (c <= now) c.setDate(c.getDate() + 1); // already past today's cutoff → tomorrow's
  return c;
}

function tonightWindow(now = new Date(), { cutoffHour = 4 } = {}) {
  return {
    startISO: new Date(now).toISOString(),
    endISO: nextCutoff(now, cutoffHour).toISOString(),
  };
}

function isWithinTonight(startTimeISO, now = new Date(), opts = {}) {
  const { startISO, endISO } = tonightWindow(now, opts);
  return startTimeISO >= startISO && startTimeISO <= endISO;
}

module.exports = { tonightWindow, isWithinTonight };
