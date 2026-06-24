// 0–10 display score (ADR 008 §3). Hard-clamped to the sentiment band so a
// 'loved' venue never renders below a 'fine' one (the Beli sentiment promise),
// with within-band rank percentile setting the decimal.

const BAND_WINDOWS = Object.freeze({
  loved: [7.0, 10.0],
  fine: [5.0, 6.9],
  disliked: [0.0, 4.9],
});
// Venues with no sentiment band map across the full range so they still order.
const UNKNOWN_WINDOW = [0.0, 10.0];

function windowFor(band) {
  return BAND_WINDOWS[band] || UNKNOWN_WINDOW;
}

// percentile 0 (worst in band) .. 1 (best in band) → score inside the band window.
function toDisplayScore(band, percentile) {
  const [lo, hi] = windowFor(band);
  const p = Math.max(0, Math.min(1, percentile));
  return Math.round((lo + p * (hi - lo)) * 10) / 10;
}

// Assign a 0–10 `displayScore` to each venue, grouped by sentiment band and
// ordered within band by Elo `rating`. venues: [{ id, rating, ... }].
function assignDisplayScores(venues, sentimentByVenue = {}) {
  const byBand = new Map();
  venues.forEach((v) => {
    const band = sentimentByVenue[v.id] || null;
    if (!byBand.has(band)) byBand.set(band, []);
    byBand.get(band).push(v);
  });

  const scoreById = {};
  for (const [band, group] of byBand) {
    const sorted = group.slice().sort((a, b) => a.rating - b.rating); // worst → best
    const n = sorted.length;
    sorted.forEach((v, idx) => {
      const pct = n === 1 ? 1 : idx / (n - 1);
      scoreById[v.id] = toDisplayScore(band, pct);
    });
  }

  return venues.map((v) => ({ ...v, displayScore: scoreById[v.id] }));
}

module.exports = { BAND_WINDOWS, toDisplayScore, assignDisplayScores };
