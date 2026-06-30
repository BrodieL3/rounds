// Information-gain comparison selection (ADR 010 §3). Fits the Bradley-Terry
// posterior once, then asks the eligible pair expected to reduce uncertainty most.

const { fit } = require('./ranking-bt');

function sigmoid(z) {
  if (z >= 0) {
    const ez = Math.exp(-z);
    return 1 / (1 + ez);
  }
  const ez = Math.exp(z);
  return ez / (1 + ez);
}

function pairKey(a, b) {
  return [a, b].sort().join('\u0000');
}

function cooldownSet(cooldownPairs) {
  return new Set((cooldownPairs || []).map(([a, b]) => pairKey(a, b)));
}

function sameBand(aId, bId, sentimentByVenue) {
  return !sentimentByVenue || sentimentByVenue[aId] === sentimentByVenue[bId];
}

function hasUnplacedMember(aPost, bPost, varianceTarget) {
  return varianceTarget === undefined
    || aPost.variance > varianceTarget
    || bPost.variance > varianceTarget;
}

function informationGain(aPost, bPost) {
  const p = sigmoid(aPost.mean - bPost.mean);
  return (aPost.variance + bPost.variance) * p * (1 - p);
}

function nextComparison({
  venues,
  comparisons = [],
  sentimentByVenue,
  cooldownPairs = [],
  varianceTarget,
} = {}) {
  if (!venues || venues.length < 2) return null;

  const post = fit(
    venues,
    comparisons,
    sentimentByVenue ? { priorBySentiment: sentimentByVenue } : {},
  );
  const cooled = cooldownSet(cooldownPairs);
  let bestPair = null;
  let bestScore = -Infinity;

  for (let i = 0; i < venues.length - 1; i++) {
    const aId = venues[i].id;
    for (let j = i + 1; j < venues.length; j++) {
      const bId = venues[j].id;
      if (aId === bId) continue;
      if (!sameBand(aId, bId, sentimentByVenue)) continue;
      if (cooled.has(pairKey(aId, bId))) continue;
      if (!hasUnplacedMember(post[aId], post[bId], varianceTarget)) continue;

      const score = informationGain(post[aId], post[bId]);
      if (score > bestScore) {
        bestScore = score;
        bestPair = [aId, bId];
      }
    }
  }

  return bestPair;
}

module.exports = { nextComparison };
