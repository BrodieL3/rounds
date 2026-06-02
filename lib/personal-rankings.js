const { computeRankings } = require('./ranking');

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
  const { cohort } = options;
  const indexedVenues = venues.map((venue, stackIndex) => ({ ...venue, stackIndex }));
  const usableComparisons = comparisonsForVenues(indexedVenues, comparisons, { cohort });

  if (usableComparisons.length === 0) {
    return venues.map((venue) => ({
      ...venue,
      personalRank: null,
      personalScore: null,
      personalComparisonCount: 0,
      hasPersonalRank: false,
    }));
  }

  const decisiveComparisons = usableComparisons.filter((c) => c.result !== 'too-tough');
  const counts = comparisonCountsByVenue(decisiveComparisons);

  let rank = 0;

  return computeRankings(indexedVenues, decisiveComparisons)
    .map((venue) => {
      const personalComparisonCount = counts[venue.id] || 0;
      const hasPersonalRank = personalComparisonCount > 0;

      if (hasPersonalRank) rank += 1;

      const { stackIndex, ...cleanVenue } = venue;

      return {
        ...cleanVenue,
        personalRank: hasPersonalRank ? rank : null,
        personalScore: hasPersonalRank ? venue.rating : null,
        personalComparisonCount,
        hasPersonalRank,
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

  return buildStackRankings(venues, comparisons)
    .filter((venue) => venue.hasPersonalRank && venue.personalComparisonCount > 0)
    .slice(0, limit);
}

module.exports = {
  buildStackRankings,
  getMyTopSpots,
  normalizeComparison,
};
