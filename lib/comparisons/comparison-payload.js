/**
 * Canonical builder for the comparison event-log record (ADR 009 §5).
 *
 * Pure + Firebase-free so it unit-tests in the repo's node env (like
 * rating-payloads.js) and stays the SINGLE SOURCE OF TRUTH for the log shape.
 * One append-only comparison log feeds both ranking tiers:
 *   - Tier A (personal): lib/ranking.js + lib/personal-rankings.js (ADR 008)
 *   - Tier B (global "best in {scope}"): built post-beta (ADR 009)
 *
 * The schema is the one irreversible decision (ADR 009): capture everything Tier
 * B needs NOW so it is buildable later with zero migration — cohort at capture
 * time, per-venue sentiment band, metro scope, session+sequence (the anti-gaming
 * reconstructability), a context flag, and an explicit version.
 */

const { getMetroForCity } = require('../constants');
const { VALID_SENTIMENTS } = require('../ratings/rating-payloads');

// v1 = legacy unversioned { userId, cohort, venueA, venueB, result, createdAt }.
const COMPARISON_SCHEMA_VERSION = 2;

// Intent of the comparison, NOT its outcome (outcome lives in `result`):
//   pairwise         — legacy/volunteered head-to-head between two rated venues
//   placement-search — a binary-search insertion step for a newly-logged venue (ADR 008 §2)
//   organic-rerank   — user re-opened a placement session to move an existing venue
//   tonight-decision — a "where to go tonight" duel: revealed preference, but the
//                      convenience confound means both tiers down-weight it (ADR 010 §5)
const VALID_CONTEXTS = Object.freeze([
  'pairwise', 'placement-search', 'organic-rerank', 'tonight-decision',
]);

function newSessionId() {
  // Sortable-ish + collision-resistant enough to group one user's session and
  // detect "one user, N comparisons on one venue" (the gaming vector, ADR 009 §6).
  return `cmp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

/**
 * Build a v2 comparison record. `createdAt` is passed through untouched so the
 * caller supplies Firestore's serverTimestamp() and this module stays Firebase-free.
 */
function buildComparisonPayload({
  userId,
  cohort,
  venueA,
  venueB,
  result,                 // venueA id | venueB id | 'too-tough'
  sentimentA = null,      // user's sentiment for venueA at compare time (loved|fine|disliked|null)
  sentimentB = null,
  city = null,
  metro = null,           // defaults to the city's metro (ADR 007) when omitted
  sessionId,
  sequence,
  context = 'pairwise',
  createdAt,
} = {}) {
  assert(userId, 'userId is required');
  assert(cohort, 'cohort is required');
  assert(venueA && venueB, 'venueA and venueB are required');
  assert(venueA !== venueB, 'venueA and venueB must differ');
  assert(
    result === venueA || result === venueB || result === 'too-tough',
    "result must be venueA, venueB, or 'too-tough'",
  );
  assert(VALID_CONTEXTS.includes(context), `context must be one of: ${VALID_CONTEXTS.join(', ')}`);
  assert(sessionId, 'sessionId is required');
  assert(Number.isInteger(sequence) && sequence >= 0, 'sequence must be a non-negative integer');
  assert(createdAt !== undefined && createdAt !== null, 'createdAt is required (Tier B needs recency)');
  assert(
    sentimentA == null || VALID_SENTIMENTS.includes(sentimentA),
    `sentimentA must be null or one of: ${VALID_SENTIMENTS.join(', ')}`,
  );
  assert(
    sentimentB == null || VALID_SENTIMENTS.includes(sentimentB),
    `sentimentB must be null or one of: ${VALID_SENTIMENTS.join(', ')}`,
  );

  return {
    schemaVersion: COMPARISON_SCHEMA_VERSION,
    userId,
    cohort,                                       // recorded at CAPTURE time (ADR 009 §5)
    venueA,
    venueB,
    result,
    sentimentA: sentimentA || null,
    sentimentB: sentimentB || null,
    city: city || null,
    metro: metro || (city ? getMetroForCity(city) : null),
    sessionId,
    sequence,
    context,
    createdAt,
  };
}

module.exports = {
  COMPARISON_SCHEMA_VERSION,
  VALID_CONTEXTS,
  newSessionId,
  buildComparisonPayload,
};
