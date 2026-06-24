const DEFAULT_RATING = 1500;
const K = 16;
const EPOCHS = 10;

// Sentiment-seeded priors (ADR 008 §1): the list is roughly ordered before any
// comparison, and comparisons refine within/across band.
const SENTIMENT_SEED = Object.freeze({ loved: 1650, fine: 1500, disliked: 1350 });

function expectedScore(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

// Outcome of a comparison as A's score: 1 win, 0 loss, 0.5 draw (too-tough).
// Returns null when the result isn't a usable outcome for these two venues.
function scoreForA(comparison) {
  if (comparison.result === comparison.a) return 1;
  if (comparison.result === comparison.b) return 0;
  if (comparison.result === 'too-tough') return 0.5;
  return null;
}

function seedRating(venue, seedBySentiment) {
  if (!seedBySentiment) return DEFAULT_RATING;
  const sentiment = typeof seedBySentiment === 'function'
    ? seedBySentiment(venue)
    : seedBySentiment[venue.id];
  return SENTIMENT_SEED[sentiment] ?? DEFAULT_RATING;
}

// Batch Elo over a venue set. `options.seedBySentiment` (map venueId→sentiment or
// a function) seeds priors; too-tough comparisons now count as draws (ADR 008 §1).
function computeRankings(venues, comparisons, options = {}) {
  const { seedBySentiment } = options;
  const ratings = {};
  const wins = {};
  const losses = {};

  venues.forEach((v) => {
    ratings[v.id] = seedRating(v, seedBySentiment);
    wins[v.id] = 0;
    losses[v.id] = 0;
  });

  // Usable = both venues seeded AND the outcome maps to a score (incl. draws).
  const usable = comparisons.filter(
    (c) => ratings[c.a] !== undefined && ratings[c.b] !== undefined && scoreForA(c) !== null,
  );

  usable.forEach((c) => {
    if (c.result === c.a) { wins[c.a]++; losses[c.b]++; }
    else if (c.result === c.b) { wins[c.b]++; losses[c.a]++; }
    // too-tough: a draw — nudges ratings below but tallies no win/loss.
  });

  for (let e = 0; e < EPOCHS; e++) {
    usable.forEach((c) => {
      const ra = ratings[c.a];
      const rb = ratings[c.b];
      const ea = expectedScore(ra, rb);
      const sa = scoreForA(c);
      ratings[c.a] = ra + K * (sa - ea);
      ratings[c.b] = rb + K * ((1 - sa) - (1 - ea));
    });
  }

  return venues
    .map((v) => ({
      ...v,
      rating: Math.round(ratings[v.id]),
      wins: wins[v.id],
      losses: losses[v.id],
    }))
    .sort((x, y) => y.rating - x.rating);
}

// Incremental single-comparison update for live binary-search placement
// (ADR 008 §1/§2). `prev` is a { [venueId]: rating } map; returns a new map with
// the two venues nudged one K-step. Unseeded venues start at DEFAULT_RATING.
function updateRatings(prev, comparison, options = {}) {
  const k = options.k ?? K;
  const next = { ...prev };
  const sa = scoreForA(comparison);
  if (sa === null) return next;
  const ra = next[comparison.a] ?? DEFAULT_RATING;
  const rb = next[comparison.b] ?? DEFAULT_RATING;
  const ea = expectedScore(ra, rb);
  next[comparison.a] = ra + k * (sa - ea);
  next[comparison.b] = rb + k * ((1 - sa) - (1 - ea));
  return next;
}

module.exports = { computeRankings, updateRatings, SENTIMENT_SEED, DEFAULT_RATING };
