const GRADIENTS = [
  { key: 'purple', colors: ['#924E7D', '#D4A5C9'] },
  { key: 'teal', colors: ['#2D6A6B', '#7FB5B5'] },
  { key: 'amber', colors: ['#B45309', '#FCD34D'] },
  { key: 'indigo', colors: ['#4338CA', '#A5B4FC'] },
  { key: 'rose', colors: ['#BE123C', '#FDA4AF'] },
  { key: 'emerald', colors: ['#047857', '#6EE7B7'] },
  { key: 'slate', colors: ['#334155', '#94A3B8'] },
  { key: 'cyan', colors: ['#0891B2', '#67E8F9'] },
];

const COHORT_ICONS = {
  cocktail_bar: 'wine',
  wine_bar: 'wine',
  sports_bar: 'american-football',
  pub: 'beer',
  night_club: 'musical-notes',
  dive_bar: 'water',
};

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function getVenueVisualFallback(venue) {
  const idx = hashString(venue.id) % GRADIENTS.length;
  const gradient = GRADIENTS[idx];
  const iconName = COHORT_ICONS[venue.cohort] || 'location';

  return {
    gradientKey: gradient.key,
    colors: gradient.colors,
    iconName,
  };
}

function formatOpenClosedStatus(hours) {
  if (!hours || typeof hours.openNow !== 'boolean') return null;

  if (hours.openNow) {
    const closesAt = hours.closesAt || hours.weekdayDescriptions?.[0]?.match(/Closes?\s+(.+)/i)?.[1];
    if (closesAt) return `Open · Closes ${closesAt}`;
    return 'Open';
  }

  return 'Closed';
}

function formatVenueAverageScore(ratings) {
  if (!ratings || ratings.length === 0) return null;

  const lovedCount = ratings.filter((r) => r.sentiment === 'loved').length;
  const pct = Math.round((lovedCount / ratings.length) * 100);

  return `${pct}% loved`;
}

module.exports = {
  getVenueVisualFallback,
  formatOpenClosedStatus,
  formatVenueAverageScore,
};
