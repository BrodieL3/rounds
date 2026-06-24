/**
 * Global design tokens for Rounds.
 */

// "05 Minimal Mono Luxe" palette (parent ISA ISC-45, chosen 2026-06-17).
// Near-monochrome charcoal + a single lime micro-accent. Recolored by ROLE:
// key NAMES are preserved; only VALUES change. Roles without a clean 05
// equivalent map to the nearest role (noted inline).
const COLORS = {
  bg: '#111111',          // background
  bgElevated: '#1A1A1A',  // elevated surface (nearest to card role)
  bgCard: '#1A1A1A',      // card / surface
  textPrimary: '#E8E2D6', // primary text
  textSecondary: '#6F6F68', // secondary / muted text
  textMuted: '#6F6F68',   // muted text (same muted role)
  textPlaceholder: '#6F6F68', // placeholder — no distinct 05 role; nearest = muted
  accent: '#C0FF3E',      // accent (lime)
  hero: '#C0FF3E',        // hero mirrors accent (was already == accent)
  onAccent: '#111111',    // text/icons rendered ON the lime accent — dark for contrast
  border: '#222220',      // borders / hairlines (05 role; new token, additive)
  danger: '#ef4444',      // status red — functional, no 05 role; kept
  success: '#22c55e',     // status green — functional, no 05 role; kept
};

const COHORT_LABELS = {
  cocktail_bar: 'Cocktail Lounge',
  wine_bar: 'Wine Bar',
  sports_bar: 'Sports Bar',
  pub: 'Pub',
  night_club: 'Nightclub',
  dive_bar: 'Dive Bar',
};

// Location is a property of the VENUE, never the user (see ADR 007). Each venue
// in assets/venues.json carries an authoritative `city`; a Rating copies it. A
// `metro` is the discovery / leaderboard LENS that groups cities (Beli-style):
// the beta pool is the Boston metro = Boston + Cambridge. Cities keep precise
// labels; the metro is only the grouping. Re-adding a city is data-only — drop
// its venues in venues.json plus a CITIES label and a CITY_TO_METRO entry.
const CITIES = {
  boston: 'Boston',
  cambridge: 'Cambridge',
};

const METROS = {
  boston: { label: 'Boston', cities: ['boston', 'cambridge'] },
};

const CITY_TO_METRO = {
  boston: 'boston',
  cambridge: 'boston',
};

// The lens a fresh user sees until P1 wires device GPS (Beli-exact).
const DEFAULT_METRO = 'boston';

// The metro a city rolls up into (e.g. 'cambridge' -> 'boston'), or null.
function getMetroForCity(cityKey) {
  return CITY_TO_METRO[cityKey] || null;
}

// The city keys a metro lens spans (e.g. 'boston' -> ['boston', 'cambridge']).
function getMetroCities(metroKey) {
  return METROS[metroKey]?.cities || [];
}

module.exports = {
  CITIES,
  METROS,
  CITY_TO_METRO,
  DEFAULT_METRO,
  COHORT_LABELS,
  COLORS,
  getMetroForCity,
  getMetroCities,
};
module.exports.__esModule = true;
