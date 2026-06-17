/**
 * Log-a-visit confirmation (F3 slice 1 — the hero "it saved" signal).
 *
 * Pure helper: given a canonical sentiment and a venue name, produce the
 * title + message for the save-confirmation the user sees after a visit is
 * logged through the canonical Rating write path (ADR 005). Kept pure and
 * UI-free so it is unit-testable and reusable by the rate screen.
 */

const SENTIMENT_LABELS = Object.freeze({
  loved: 'Loved it',
  fine: 'It was fine',
  disliked: "Didn't like it",
});

function buildLogConfirmation(sentiment, venueName) {
  const label = SENTIMENT_LABELS[sentiment];
  if (!label) {
    throw new Error('A valid sentiment is required to confirm a log');
  }

  const name = typeof venueName === 'string' ? venueName.trim() : '';
  const where = name ? ` at ${name}` : '';

  return {
    title: 'Logged!',
    message: `Your visit${where} is saved — "${label}". It's in your list.`,
  };
}

module.exports = {
  SENTIMENT_LABELS,
  buildLogConfirmation,
};
