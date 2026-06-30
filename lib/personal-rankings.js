const { fit, lowerBound } = require('./ranking-bt');
const { assignDisplayScores } = require('./scoring');

const RATED_SENTIMENTS = new Set(['loved', 'fine', 'disliked']);

// ADR 010: Tier A ranks by the per-user Bradley-Terry posterior lower bound
// (mean − k·sd). A ranked venue with fewer than this many decisive comparisons
// is `provisional` — its rank/score show, but they're seeded, not yet confirmed.
const LOWER_BOUND_K = 1;
const PROVISIONAL_MIN_COMPARISONS = 1;

function normalizeComparison(comparison) {
  const a = comparison.a || comparison.venueA;
  const b = comparison.b || comparison.venueB;

  if (!a || !b) return null;

  return {
    a,
    b,
    result: comparison.result,
    cohort: comparison.cohort,
  };
}

function comparisonsForVenues(venues, comparisons, options = {}) {
  const venueIds = new Set(venues.map((venue) => venue.id));
  const { cohort } = options;

  return comparisons
    .map(normalizeComparison)
    .filter(Boolean)
    .filter((comparison) => venueIds.has(comparison.a) && venueIds.has(comparison.b))
    .filter((comparison) => !cohort || comparison.cohort === cohort);
}

function comparisonCountsByVenue(comparisons) {
  const counts = {};

  comparisons.forEach((comparison) => {
    counts[comparison.a] = (counts[comparison.a] || 0) + 1;
    counts[comparison.b] = (counts[comparison.b] || 0) + 1;
  });

  return counts;
}

function buildStackRankings(venues, comparisons, options = {}) {
  const { cohort, sentimentByVenue } = options;
  const indexedVenues = venues.map((venue, stackIndex) => ({ ...venue, stackIndex }));
  const usableComparisons = comparisonsForVenues(indexedVenues, comparisons, { cohort });

  // A venue earns a personal rank if it's been RATED (has a sentiment band) OR
  // compared. Ratings seed the order; comparisons only refine it (ADR 008 §1).
  // Without a sentiment map, rank-eligibility stays comparison-only (legacy callers).
  const isRated = (id) => Boolean(sentimentByVenue && RATED_SENTIMENTS.has(sentimentByVenue[id]));

  if (usableComparisons.length === 0 && !indexedVenues.some((venue) => isRated(venue.id))) {
    return venues.map((venue) => ({
      ...venue,
      personalRank: null,
      personalScore: null,
      personalComparisonCount: 0,
      hasPersonalRank: false,
      provisional: false,
    }));
  }

  // Rank-eligibility / counts come from DECISIVE comparisons only (a draw alone
  // doesn't earn a venue a rank), but too-tough draws DO flow into the BT fit so
  // the posterior reflects them (ADR 010 §1).
  const decisiveComparisons = usableComparisons.filter((c) => c.result !== 'too-tough');
  const counts = comparisonCountsByVenue(decisiveComparisons);

  // Position authority is the per-user Bradley-Terry posterior, ranked by its
  // conservative lower bound (ADR 010 §1/§2); sentiment seeds the prior.
  const post = fit(
    indexedVenues,
    usableComparisons,
    sentimentByVenue ? { priorBySentiment: sentimentByVenue } : {},
  );
  const ranked = indexedVenues
    .map((venue) => ({ ...venue, rating: lowerBound(post[venue.id], LOWER_BOUND_K) }))
    .sort((a, b) => b.rating - a.rating);

  // With sentiment known, present in band-clamped 0–10 display order (loved above
  // fine above disliked); otherwise keep the raw lower-bound order + raw score.
  const scored = sentimentByVenue ? assignDisplayScores(ranked, sentimentByVenue) : ranked;
  const ordered = sentimentByVenue
    ? scored.slice().sort((a, b) => b.displayScore - a.displayScore)
    : scored;

  let rank = 0;

  return ordered
    .map((venue) => {
      const personalComparisonCount = counts[venue.id] || 0;
      const hasPersonalRank = personalComparisonCount > 0 || isRated(venue.id);
      const provisional = hasPersonalRank
        && personalComparisonCount < PROVISIONAL_MIN_COMPARISONS;

      if (hasPersonalRank) rank += 1;

      const { stackIndex, displayScore, ...cleanVenue } = venue;
      const personalScore = !hasPersonalRank
        ? null
        : (sentimentByVenue ? displayScore : venue.rating);

      return {
        ...cleanVenue,
        personalRank: hasPersonalRank ? rank : null,
        personalScore,
        personalComparisonCount,
        hasPersonalRank,
        provisional,
        stackIndex,
      };
    })
    .sort((a, b) => {
      if (a.hasPersonalRank && b.hasPersonalRank) return a.personalRank - b.personalRank;
      if (a.hasPersonalRank) return -1;
      if (b.hasPersonalRank) return 1;
      return a.stackIndex - b.stackIndex;
    })
    .map(({ stackIndex, ...venue }) => venue);
}

function getMyTopSpots(venues, comparisons, options = {}) {
  const { limit = 5 } = options;

  return buildStackRankings(venues, comparisons, options)
    .filter((venue) => venue.hasPersonalRank && venue.personalComparisonCount > 0)
    .slice(0, limit);
}

module.exports = {
  buildStackRankings,
  getMyTopSpots,
  normalizeComparison,
};
