// Pure. Turns raw scraped items into a deduped upsert plan. Each item carries its
// known venue (source-keyed scraping), so normalize computes the deterministic id
// and identical occurrences collapse to a single upsert. A malformed item is
// skipped and reported, never fatal (per-source resilience). Firebase-free; the
// scheduled job wraps this with the actual fetch + admin upsert.

const { normalizeEventItem } = require('../events/normalize-event');

function planIngest(items = []) {
  const byId = new Map();
  const skipped = [];
  for (const item of items) {
    try {
      const { id, payload } = normalizeEventItem(item);
      byId.set(id, { id, payload }); // same occurrence (venue|date|title) collapses
    } catch (err) {
      skipped.push({ item, error: err.message });
    }
  }
  return { upserts: [...byId.values()], skipped };
}

module.exports = { planIngest };
