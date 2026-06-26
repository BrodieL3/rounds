// Server-only. Events are written exclusively by the seed script and the P4
// ingestion Function, never the client, so depending on Node's crypto here is
// safe. buildEventId is the dedup contract: the same occurrence must always
// hash to the same id so re-writes upsert instead of duplicating. slug is the
// single point of failure — it normalizes title *form* (case, punctuation,
// whitespace, diacritics) but never meaning, so distinct wordings stay distinct.

const crypto = require('crypto');

function slug(title) {
  if (typeof title !== 'string') throw new Error('title must be a string');
  return title
    .normalize('NFKD') // separate accents from their base letters
    .replace(/[̀-ͯ]/g, '') // drop the separated diacritic marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ') // any run of non-alphanumerics becomes a gap
    .trim()
    .replace(/\s+/g, '-'); // collapse gaps into single hyphens
}

function buildEventId({ venueId, localDate, title } = {}) {
  if (!venueId) throw new Error('venueId is required');
  if (!localDate) throw new Error('localDate is required');
  if (!title) throw new Error('title is required');
  const key = `${venueId}|${localDate}|${slug(title)}`;
  return crypto.createHash('sha1').update(key).digest('hex').slice(0, 20);
}

module.exports = { slug, buildEventId };
