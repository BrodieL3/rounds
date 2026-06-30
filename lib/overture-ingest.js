/**
 * Pure, UI-agnostic transforms that turn an Overture Maps "places" row (which
 * now includes Foursquare OS Places) into a venue in the EXACT shape the app's
 * catalog consumes — see lib/venue-catalog.js and the schema gate in
 * lib/__tests__/venues-seed.test.js. The orchestrator scripts/overture-ingest.js
 * does the duckdb/S3/fs I/O; this module is the deterministic mapping.
 *
 * Kept free of fs/duckdb/Firebase imports (lib-wide convention) so it runs in
 * the repo's node test env without a JSX transform.
 */

// Overture / Foursquare primary category -> one of the six Rounds cohorts.
// Membership here means a confident, specific mapping ('high' confidence). Bare
// "bar" and "lounge" are deliberately NOT here — they're too ambiguous (a dorm
// "lounge", an "oxygen bar") and fall through to a 'low'-confidence default.
const COHORT_BY_CATEGORY = {
  cocktail_bar: 'cocktail_bar',
  cocktail_lounge: 'cocktail_bar',
  hotel_bar: 'cocktail_bar',
  speakeasy: 'cocktail_bar',
  wine_bar: 'wine_bar',
  sports_bar: 'sports_bar',
  pub: 'pub',
  gastropub: 'pub',
  irish_pub: 'pub',
  tavern: 'pub',
  brewery: 'pub',
  brewpub: 'pub',
  beer_bar: 'pub',
  beer_garden: 'pub',
  taproom: 'pub',
  night_club: 'night_club',
  nightclub: 'night_club',
  dance_club: 'night_club',
  dive_bar: 'dive_bar',
};

const ROUNDS_COHORTS = new Set([
  'cocktail_bar', 'wine_bar', 'sports_bar', 'pub', 'night_club', 'dive_bar',
]);

const OVERTURE_ATTRIBUTION =
  '© Overture Maps Foundation — places theme. Includes data © Foursquare Labs, Inc. ' +
  '(Apache-2.0) and CDLA-Permissive-2.0 sources. https://overturemaps.org/';

// A bar-ish category that isn't specifically mapped still belongs in the catalog
// (defaulting to cocktail_bar, 'low'). The boundary markers keep "barber" and
// "barbecue" out — they contain "bar" but are not bars.
const BAR_FALLBACK = /(^|_)(bar|pub|tavern|lounge|nightlife|nightclub|speakeasy|brewery|brewpub|cantina)(_|$)/;
const NOT_A_BAR = /barber|barbecue|barbeque/;

// "Bars" by name/category that are not nightlife venues — dropped outright even
// when the category passes BAR_FALLBACK. Category side catches food/wellness
// "_bar"s; name side catches dorm lounges and paint-and-sip "art bars".
const NON_NIGHTLIFE_CATEGORY = /barber|barbecue|barbeque|juice|snack|sushi|salad|coffee|cafe|oxygen|nail|kava|milk|smoothie|cereal/;
const NON_NIGHTLIFE_NAME = /\b(paint|art studio|residence hall|dining hall|dormitory|student cent|food court|cafeteria)\b/i;

function normalizeCategory(category) {
  return String(category || '').trim().toLowerCase();
}

/** True when a row is bar-shaped but clearly not a nightlife venue. */
function isNonNightlife(name, category) {
  return NON_NIGHTLIFE_CATEGORY.test(normalizeCategory(category))
    || NON_NIGHTLIFE_NAME.test(String(name || ''));
}

/**
 * Map an Overture category (+ its alternates) to a Rounds cohort.
 * @returns {{cohort: string, cohortConfidence: 'high'|'low'} | null}
 */
function categoryToCohort(category, altCategories = []) {
  const primary = normalizeCategory(category);
  if (COHORT_BY_CATEGORY[primary]) {
    return { cohort: COHORT_BY_CATEGORY[primary], cohortConfidence: 'high' };
  }
  // Generic/unmapped bar: borrow a specific cohort from an alternate if present.
  for (const alt of altCategories || []) {
    const mapped = COHORT_BY_CATEGORY[normalizeCategory(alt)];
    if (mapped) return { cohort: mapped, cohortConfidence: 'low' };
  }
  if (BAR_FALLBACK.test(primary) && !NOT_A_BAR.test(primary)) {
    return { cohort: 'cocktail_bar', cohortConfidence: 'low' };
  }
  return null;
}

/** Beta scope is Boston + Cambridge only (ADR 007); Cambridge vs everything-else. */
function localityToCity(locality) {
  return normalizeCategory(locality) === 'cambridge' ? 'cambridge' : 'boston';
}

/** "123 Main St, Boston, MA 02114" from Overture address parts; skips blanks. */
function composeAddress({ street, locality, region, postcode } = {}) {
  const stateZip = [region, postcode].map((s) => String(s || '').trim()).filter(Boolean).join(' ');
  return [street, locality, stateZip]
    .map((s) => String(s || '').trim())
    .filter(Boolean)
    .join(', ');
}

/**
 * Shape one Overture row into a catalog venue, or null if it lacks coordinates,
 * is non-nightlife, or doesn't map to a cohort. Output mirrors the seed schema
 * exactly (no google/price/photo fields) so the 14 consumers and the schema test
 * keep passing.
 */
function shapeVenue(row) {
  const lat = Number(row && row.latitude);
  const lng = Number(row && row.longitude);
  const name = String((row && row.name) || '').trim();
  if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (isNonNightlife(name, row.category)) return null;

  const mapped = categoryToCohort(row.category, row.alt_categories);
  if (!mapped) return null;

  const types = [row.category, ...(row.alt_categories || [])]
    .map(normalizeCategory)
    .filter(Boolean)
    .map((c) => `overture:${c}`);

  return {
    id: `ovt:${row.id}`,
    name,
    cohort: mapped.cohort,
    city: localityToCity(row.locality),
    address: composeAddress(row),
    latitude: lat,
    longitude: lng,
    location: { latitude: lat, longitude: lng },
    types,
    source: 'overture-places',
    cohortConfidence: mapped.cohortConfidence,
  };
}

/**
 * Collapse Overture's multi-source near-duplicates: same venue name (ignoring a
 * leading "the" and punctuation) at the same street == one place. Coords/GERS id
 * differ across source records, so id-dedup alone misses them.
 */
function dedupeKey(venue) {
  const name = venue.name.toLowerCase().replace(/^the\s+/, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const street = String(venue.address.split(',')[0] || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return `${name}|${street}`;
}

/**
 * Build the cities-keyed catalog the app reads. Collapses near-duplicates
 * (keeping the higher-confidence record), drops unmappable/non-nightlife rows,
 * emits only boston/cambridge groups.
 */
function buildCatalog(rows, { generatedAt } = {}) {
  const byKey = new Map();
  for (const row of rows || []) {
    const venue = shapeVenue(row);
    if (!venue) continue;
    const key = dedupeKey(venue);
    const existing = byKey.get(key);
    // First record wins, but a 'high'-confidence record upgrades a 'low' one.
    if (!existing || (existing.cohortConfidence === 'low' && venue.cohortConfidence === 'high')) {
      byKey.set(key, venue);
    }
  }

  const cities = {
    boston: { name: 'Boston', lat: 42.3601, lng: -71.0589, venues: [] },
    cambridge: { name: 'Cambridge', lat: 42.3736, lng: -71.1097, venues: [] },
  };
  for (const venue of byKey.values()) cities[venue.city].venues.push(venue);

  return {
    attribution: OVERTURE_ATTRIBUTION,
    source: 'overture-places',
    license: 'CDLA-Permissive-2.0 AND Apache-2.0',
    generatedAt: generatedAt || new Date().toISOString(),
    cities,
  };
}

module.exports = {
  COHORT_BY_CATEGORY,
  ROUNDS_COHORTS,
  OVERTURE_ATTRIBUTION,
  isNonNightlife,
  categoryToCohort,
  localityToCity,
  composeAddress,
  shapeVenue,
  dedupeKey,
  buildCatalog,
};
module.exports.__esModule = true;
