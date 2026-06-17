/**
 * Pure, UI-free engine for the My List tab (F3 final slice — the payoff;
 * parent ISA ISC-17/18/19/54/55).
 *
 * Two responsibilities, both kept free of React/Firebase so they run in the
 * repo's node test env (matching log-visit.js, venue-catalog.js,
 * personal-rankings.js — no JSX transform):
 *
 *   1. buildVisitHistory(ratings)  — turn the user's OWN ratings (read via
 *      rating-service / Firestore) into a scannable, most-recent-first record
 *      of the bars they've rated, collapsed to one entry per venue so a repeat
 *      log never forks a venue's identity (ISC-23).
 *
 *   2. getRankUnlockState(logCount) — the rank-unlocks-at-5 gate: locked with a
 *      "N of 5" progress hint until the 5th log, unlocked at N≥5 (ISC-18/19).
 *
 * The ranked list itself is still derived from Comparisons via the EXISTING
 * Elo (lib/ranking.js / lib/personal-rankings.js); this module only decides
 * WHEN that list is revealed and renders the logged-visit history.
 */

const RANK_UNLOCK_THRESHOLD = 5;

const SENTIMENT_HISTORY_LABELS = Object.freeze({
  loved: 'Loved it',
  fine: 'It was fine',
  disliked: "Didn't like it",
});

/**
 * Coerce the several createdAt shapes Firestore hands us into a sortable
 * millisecond number. Returns 0 for a pending serverTimestamp (null) so the
 * row still renders (just sorts oldest) instead of being dropped.
 */
function createdAtMillis(createdAt) {
  if (createdAt == null) return 0;
  if (typeof createdAt === 'number') return createdAt;
  if (typeof createdAt.toMillis === 'function') return createdAt.toMillis();
  if (typeof createdAt.seconds === 'number') return createdAt.seconds * 1000;
  const parsed = new Date(createdAt).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Count the user's logged visits. Defensive against missing input — a
 * zero-log first session must read as exactly 0, never throw.
 * @param {Array<object>=} ratings
 * @returns {number}
 */
function getLogCount(ratings) {
  return Array.isArray(ratings) ? ratings.length : 0;
}

/**
 * Build the My List history: one entry per venue (latest log wins), decorated
 * with a human sentiment label and a stable key, sorted most-recent-first.
 * Malformed rows (no venueId) are skipped so the UI never renders a ghost.
 * @param {Array<object>=} ratings  the user's own ratings
 * @returns {Array<object>}
 */
function buildVisitHistory(ratings) {
  if (!Array.isArray(ratings)) return [];

  const byVenue = new Map();

  for (const rating of ratings) {
    const venueId = rating?.venueId;
    if (!venueId) continue;

    const millis = createdAtMillis(rating.createdAt);
    const existing = byVenue.get(venueId);

    if (!existing) {
      byVenue.set(venueId, { latest: rating, latestMillis: millis, visitCount: 1 });
      continue;
    }

    existing.visitCount += 1;
    // Keep the most recent log as the surviving entry's sentiment/notes.
    if (millis >= existing.latestMillis) {
      existing.latest = rating;
      existing.latestMillis = millis;
    }
  }

  return Array.from(byVenue.values())
    .sort((a, b) => b.latestMillis - a.latestMillis)
    .map(({ latest, latestMillis, visitCount }) => ({
      key: latest.id || latest.venueId,
      venueId: latest.venueId,
      venueName: latest.venueName || '',
      cohort: latest.cohort || null,
      sentiment: latest.sentiment,
      sentimentLabel: SENTIMENT_HISTORY_LABELS[latest.sentiment] || '',
      notes: latest.notes || '',
      visitCount,
      loggedAtMillis: latestMillis,
    }));
}

/**
 * The rank-unlock-at-5 gate. Locked (with a "N of 5" progress hint) until the
 * user's logCount reaches the threshold, unlocked at N≥threshold. Invalid /
 * missing counts clamp to 0 (locked) rather than throwing.
 * @param {number} logCount        the user's logged-visit count
 * @param {number=} threshold      defaults to RANK_UNLOCK_THRESHOLD (5)
 * @returns {{ unlocked: boolean, logCount: number, threshold: number, remaining: number, progressLabel: string }}
 */
function getRankUnlockState(logCount, threshold = RANK_UNLOCK_THRESHOLD) {
  const safeCount = Number.isFinite(logCount) && logCount > 0 ? Math.floor(logCount) : 0;
  const unlocked = safeCount >= threshold;
  const remaining = Math.max(0, threshold - safeCount);

  return {
    unlocked,
    logCount: safeCount,
    threshold,
    remaining,
    progressLabel: `${safeCount} of ${threshold}`,
  };
}

module.exports = {
  RANK_UNLOCK_THRESHOLD,
  SENTIMENT_HISTORY_LABELS,
  buildVisitHistory,
  getLogCount,
  getRankUnlockState,
};
module.exports.__esModule = true;
