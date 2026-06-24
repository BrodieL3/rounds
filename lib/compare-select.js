// Binary-search comparison SELECTION (ADR 008 §2). Elo (lib/ranking) stays the
// single source of truth for position; this module only decides which pair to ask
// next so a newly-logged venue lands in ~log2(n) taps instead of all-pairs O(n^2).
//
// Stateless: each call reconstructs a target venue's still-ambiguous insertion
// interval from its prior decisive comparisons, then returns the midpoint peer to
// ask next. Returns null when every venue is placed (interval collapsed).

const { computeRankings } = require('./ranking');

// Decisive comparison count per venue (too-tough excluded).
function decisiveCounts(comparisons) {
  const counts = {};
  comparisons.forEach((c) => {
    if (c.result === c.a || c.result === c.b) {
      counts[c.a] = (counts[c.a] || 0) + 1;
      counts[c.b] = (counts[c.b] || 0) + 1;
    }
  });
  return counts;
}

// Given `sortedPeers` (worst→best by current rating) and the full comparison log,
// reconstruct target's insertion interval [lo, hi) and return the midpoint peer to
// ask next — or null if the interval collapsed (placed) or a too-tough froze it.
function nextOpponentFor(targetId, sortedPeers, comparisons) {
  const peerIndex = new Map(sortedPeers.map((p, i) => [p.id, i]));
  let lo = 0;
  let hi = sortedPeers.length;
  let frozen = false;

  comparisons.forEach((c) => {
    if (c.a !== targetId && c.b !== targetId) return;
    const otherId = c.a === targetId ? c.b : c.a;
    const i = peerIndex.get(otherId);
    if (i === undefined) return; // peer not in this band/list
    if (c.result === 'too-tough') { frozen = true; return; } // adjacent → stop
    if (c.result === targetId) lo = Math.max(lo, i + 1); // target ranks above peer i
    else hi = Math.min(hi, i); // target ranks below peer i
  });

  if (frozen || lo >= hi) return null; // placed
  const mid = Math.floor((lo + hi) / 2);
  return sortedPeers[Math.min(mid, sortedPeers.length - 1)].id;
}

// Pick the next [target, opponent] pair. Places the least-compared venue first
// (the freshly-logged one floats up); returns null when everything is placed.
function nextComparison({ venues, comparisons = [], sentimentByVenue = {} } = {}) {
  if (!venues || venues.length < 2) return null;
  const counts = decisiveCounts(comparisons);

  const order = venues
    .map((v) => ({ id: v.id, count: counts[v.id] || 0 }))
    .sort((a, b) => a.count - b.count);

  for (const { id: targetId } of order) {
    const band = sentimentByVenue[targetId] || null;
    // Compare within band when known (ADR 008 §2); else against all cohort peers.
    const peers = venues.filter((v) => v.id !== targetId
      && (band == null || (sentimentByVenue[v.id] || null) === band));
    if (peers.length === 0) continue;

    const ranked = computeRankings(peers, comparisons, { seedBySentiment: sentimentByVenue });
    const sortedPeers = ranked.slice().sort((a, b) => a.rating - b.rating); // worst → best
    const opponentId = nextOpponentFor(targetId, sortedPeers, comparisons);
    if (opponentId) return [targetId, opponentId];
  }

  return null; // all venues placed
}

module.exports = { nextComparison, nextOpponentFor, decisiveCounts };
