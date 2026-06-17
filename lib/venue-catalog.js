/**
 * Pure, UI-agnostic helpers for the F3 browse/find surface (parent ISA
 * ISC-22/24/54): turn the cities-keyed OSM seed (`assets/venues.json`) into a
 * browsable, grouped, searchable catalog so a brand-new user with ZERO posts
 * and ZERO friends can FIND a bar to log.
 *
 * Kept free of React/Firebase imports — matching the lib-wide convention
 * (onboarding.js, feed-view-model.js, venue-display.js) so it runs in the
 * repo's node test env (no JSX transform).
 */

const { CITIES, COHORT_LABELS } = require('./constants');
const { getVenueNeighborhood } = require('./venue-display');

const SEARCH_MIN_LENGTH = 2;
const DEFAULT_ATTRIBUTION = '© OpenStreetMap contributors, ODbL. https://www.openstreetmap.org/copyright';

function cityLabel(cityKey) {
  return CITIES[cityKey] || cityKey;
}

function byName(a, b) {
  return (a.name || '').localeCompare(b.name || '');
}

/**
 * Flatten the cities-keyed seed into a single corpus, tagging each venue with
 * its `cityKey` (the seed group it came from) so downstream UI can route and
 * label without re-deriving the city. Defensive: a missing/empty seed yields
 * an empty array rather than throwing.
 * @param {{ cities?: Record<string, { venues?: any[] }> }} venueSeed
 * @returns {Array<object & { cityKey: string }>}
 */
function flattenCatalogVenues(venueSeed) {
  const cities = venueSeed?.cities || {};
  return Object.entries(cities).flatMap(([cityKey, city]) =>
    (city?.venues || []).map((venue) => ({ ...venue, cityKey })));
}

/**
 * Group the seed into name-sorted, per-city sections for a scannable browse
 * surface (SectionList-shaped: `{ title, cityKey, count, data }`). Empty
 * cities are omitted so the list never shows a bare header with no rows.
 * @param {{ cities?: Record<string, { venues?: any[] }> }} venueSeed
 * @returns {Array<{ title: string, cityKey: string, count: number, data: object[] }>}
 */
function buildVenueCatalog(venueSeed) {
  const cities = venueSeed?.cities || {};
  return Object.entries(cities)
    .map(([cityKey, city]) => {
      const data = (city?.venues || [])
        .map((venue) => ({ ...venue, cityKey }))
        .sort(byName);
      return { title: cityLabel(cityKey), cityKey, count: data.length, data };
    })
    .filter((section) => section.count > 0);
}

/**
 * Build the lowercased haystack a venue is searchable by: its name, its cohort
 * label (so "pub"/"cocktail" work), and its derived neighborhood (so "downtown"
 * works even though the OSM seed has no neighborhood field).
 */
function searchHaystack(venue) {
  const cohortLabel = COHORT_LABELS[venue.cohort] || venue.cohort || '';
  const neighborhood = getVenueNeighborhood(venue, venue.cityKey || venue.city) || '';
  return `${venue.name || ''} ${cohortLabel} ${venue.cohort || ''} ${neighborhood}`.toLowerCase();
}

/**
 * Filter the corpus by a free-text query over name / cohort / neighborhood.
 * Case-insensitive, trimmed; queries under SEARCH_MIN_LENGTH return nothing so
 * the UI never dumps the whole catalog on a stray keystroke. Results are
 * name-sorted for a stable, scannable list. Never throws on bad input.
 * @param {object[]} venues  corpus from flattenCatalogVenues
 * @param {string} queryText
 * @returns {object[]}
 */
function searchVenues(venues, queryText) {
  const needle = (queryText || '').trim().toLowerCase();
  if (needle.length < SEARCH_MIN_LENGTH) return [];
  if (!Array.isArray(venues)) return [];
  return venues
    .filter((venue) => searchHaystack(venue).includes(needle))
    .sort(byName);
}

/**
 * The ODbL attribution string to surface in-app (parent ISA ISC-11). Falls
 * back to a safe default if the seed omits it.
 */
function getAttribution(venueSeed) {
  return venueSeed?.attribution || DEFAULT_ATTRIBUTION;
}

module.exports = {
  SEARCH_MIN_LENGTH,
  flattenCatalogVenues,
  buildVenueCatalog,
  searchVenues,
  getAttribution,
};
module.exports.__esModule = true;
