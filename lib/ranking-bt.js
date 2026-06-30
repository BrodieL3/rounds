const SIGMA0_SQ = 1;
const PRIOR_PRECISION = 1 / SIGMA0_SQ;
const MAX_ITERS = 1000;
const TOLERANCE = 1e-10;

const SENTIMENT_PRIOR = Object.freeze({ loved: 1, fine: 0, disliked: -1 });

function sigmoid(z) {
  if (z >= 0) {
    const ez = Math.exp(-z);
    return 1 / (1 + ez);
  }
  const ez = Math.exp(z);
  return ez / (1 + ez);
}

function scoreForA(comparison) {
  if (comparison.result === comparison.a) return 1;
  if (comparison.result === comparison.b) return 0;
  if (comparison.result === 'too-tough') return 0.5;
  return null;
}

function priorMean(venue, priorBySentiment) {
  if (!priorBySentiment) return 0;
  const sentiment = typeof priorBySentiment === 'function'
    ? priorBySentiment(venue)
    : priorBySentiment[venue.id];
  return SENTIMENT_PRIOR[sentiment] ?? 0;
}

function comparisonWeight(comparison, options) {
  let recencyWeight = 1;
  if (
    options.recencyHalfLife !== undefined
    && options.now !== undefined
    && typeof comparison.createdAt === 'number'
  ) {
    recencyWeight = 0.5 ** ((options.now - comparison.createdAt) / options.recencyHalfLife);
  }

  const contextWeight = options.contextWeights
    ? (options.contextWeights[comparison.context] ?? 1)
    : 1;

  return recencyWeight * contextWeight;
}

function usableComparisons(comparisons, venueSet, options) {
  return comparisons.reduce((usable, comparison) => {
    const score = scoreForA(comparison);
    if (!venueSet.has(comparison.a) || !venueSet.has(comparison.b) || score === null) return usable;
    usable.push({
      a: comparison.a,
      b: comparison.b,
      score,
      weight: comparisonWeight(comparison, options),
    });
    return usable;
  }, []);
}

function fit(venues, comparisons, options = {}) {
  const venueSet = new Set(venues.map((venue) => venue.id));
  const usable = usableComparisons(comparisons, venueSet, options);
  const mu = {};
  const theta = {};
  const counts = {};

  venues.forEach((venue) => {
    mu[venue.id] = priorMean(venue, options.priorBySentiment);
    theta[venue.id] = mu[venue.id];
    counts[venue.id] = 0;
  });

  usable.forEach((comparison) => {
    counts[comparison.a]++;
    counts[comparison.b]++;
  });

  for (let iter = 0; iter < MAX_ITERS; iter++) {
    let maxUpdate = 0;

    venues.forEach((venue) => {
      const id = venue.id;
      let grad = 0;
      let info = 0;

      usable.forEach((comparison) => {
        if (comparison.a !== id && comparison.b !== id) return;
        const p = sigmoid(theta[comparison.a] - theta[comparison.b]);
        const delta = comparison.weight * (comparison.score - p);
        grad += comparison.a === id ? delta : -delta;
        info += comparison.weight * p * (1 - p);
      });

      grad -= (theta[id] - mu[id]) / SIGMA0_SQ;
      const curv = PRIOR_PRECISION + info;
      const update = grad / curv;
      theta[id] += update;
      maxUpdate = Math.max(maxUpdate, Math.abs(update));
    });

    if (maxUpdate < TOLERANCE) break;
  }

  const post = {};
  venues.forEach((venue) => {
    const id = venue.id;
    let info = 0;

    usable.forEach((comparison) => {
      if (comparison.a !== id && comparison.b !== id) return;
      const p = sigmoid(theta[comparison.a] - theta[comparison.b]);
      info += comparison.weight * p * (1 - p);
    });

    post[id] = {
      mean: theta[id],
      variance: 1 / (PRIOR_PRECISION + info),
      comparisons: counts[id],
    };
  });

  return post;
}

function lowerBound(posterior, k) {
  return posterior.mean - k * Math.sqrt(posterior.variance);
}

module.exports = { fit, lowerBound, SENTIMENT_PRIOR };
