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

const CITIES = {
  nyc: 'New York',
  boston: 'Boston',
  cambridge: 'Cambridge', // beta pool = Boston + Cambridge (ISA ISC-58)
  chicago: 'Chicago',
  sf: 'San Francisco',
};

module.exports = {
  CITIES,
  COHORT_LABELS,
  COLORS,
};
module.exports.__esModule = true;
