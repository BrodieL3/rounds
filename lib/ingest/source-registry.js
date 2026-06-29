// Pure. Curated venue → event-source map for source-keyed scraping: each entry is
// a known venue's own feed, so a scraped event's venueId is known a priori and the
// fuzzy venue-matching problem is avoided. Firebase-free.

function buildSourceRegistry(entries = []) {
  const byVenue = new Map();
  for (const e of entries) {
    if (!e || !e.venueId) throw new Error('source entry requires a venueId');
    if (!e.eventbrite && !e.site) throw new Error(`source for ${e.venueId} needs an eventbrite or site url`);
    byVenue.set(e.venueId, e);
  }
  return {
    get: (venueId) => byVenue.get(venueId) || null,
    has: (venueId) => byVenue.has(venueId),
    list: () => [...byVenue.values()],
    get size() { return byVenue.size; },
  };
}

module.exports = { buildSourceRegistry };
