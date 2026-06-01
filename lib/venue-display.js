const NEIGHBORHOOD_FIELDS = [
  'neighborhood',
  'neighborhoodName',
  'area',
  'district',
  'locality',
];

const CITY_NEIGHBORHOOD_BOUNDS = {
  nyc: [
    { name: 'Williamsburg', minLat: 40.700, maxLat: 40.730, minLng: -73.970, maxLng: -73.935 },
    { name: 'Lower East Side', minLat: 40.710, maxLat: 40.727, minLng: -74.000, maxLng: -73.980 },
    { name: 'East Village', minLat: 40.724, maxLat: 40.735, minLng: -73.995, maxLng: -73.975 },
    { name: 'West Village', minLat: 40.729, maxLat: 40.746, minLng: -74.012, maxLng: -73.996 },
    { name: 'SoHo', minLat: 40.718, maxLat: 40.730, minLng: -74.010, maxLng: -73.990 },
    { name: 'Chelsea', minLat: 40.746, maxLat: 40.758, minLng: -74.010, maxLng: -73.990 },
    { name: 'Midtown', minLat: 40.750, maxLat: 40.770, minLng: -74.005, maxLng: -73.970 },
  ],
  boston: [
    { name: 'Back Bay', minLat: 42.345, maxLat: 42.355, minLng: -71.090, maxLng: -71.070 },
    { name: 'South End', minLat: 42.335, maxLat: 42.348, minLng: -71.085, maxLng: -71.060 },
    { name: 'Seaport', minLat: 42.345, maxLat: 42.358, minLng: -71.055, maxLng: -71.030 },
    { name: 'Downtown', minLat: 42.352, maxLat: 42.365, minLng: -71.070, maxLng: -71.050 },
  ],
  chicago: [
    { name: 'River North', minLat: 41.888, maxLat: 41.902, minLng: -87.640, maxLng: -87.620 },
    { name: 'West Loop', minLat: 41.875, maxLat: 41.890, minLng: -87.665, maxLng: -87.635 },
    { name: 'Logan Square', minLat: 41.915, maxLat: 41.940, minLng: -87.720, maxLng: -87.680 },
    { name: 'Wicker Park', minLat: 41.900, maxLat: 41.920, minLng: -87.690, maxLng: -87.665 },
  ],
  sf: [
    { name: 'Mission', minLat: 37.748, maxLat: 37.770, minLng: -122.430, maxLng: -122.405 },
    { name: 'SoMa', minLat: 37.770, maxLat: 37.790, minLng: -122.415, maxLng: -122.390 },
    { name: 'Hayes Valley', minLat: 37.772, maxLat: 37.782, minLng: -122.435, maxLng: -122.420 },
    { name: 'North Beach', minLat: 37.795, maxLat: 37.810, minLng: -122.420, maxLng: -122.400 },
  ],
};

function getExplicitNeighborhood(venue) {
  for (const field of NEIGHBORHOOD_FIELDS) {
    if (venue[field]) return venue[field];
  }

  return null;
}

function getVenueNeighborhood(venue, cityKey) {
  const explicit = getExplicitNeighborhood(venue);
  if (explicit) return explicit;

  const { latitude, longitude } = venue.location || {};
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;

  const bounds = CITY_NEIGHBORHOOD_BOUNDS[cityKey] || [];
  const match = bounds.find((area) => (
    latitude >= area.minLat
    && latitude <= area.maxLat
    && longitude >= area.minLng
    && longitude <= area.maxLng
  ));

  return match?.name || null;
}

function getShortAddress(venue) {
  return venue.address?.split(',')[0]?.trim() || '';
}

function getAddressCityState(venue) {
  const parts = venue.address?.split(',').map((part) => part.trim()).filter(Boolean) || [];
  if (parts.length < 3) return null;

  const city = parts[parts.length - 3];
  const state = parts[parts.length - 2]?.match(/^[A-Z]{2}/)?.[0];
  if (!city || !state) return null;

  return `${city}, ${state}`;
}

function formatPriceTier(priceLevel) {
  if (typeof priceLevel === 'number' && priceLevel > 0) return '$'.repeat(Math.min(priceLevel, 4));
  if (typeof priceLevel !== 'string') return null;
  if (/^\$+$/.test(priceLevel)) return priceLevel;

  const priceMap = {
    PRICE_LEVEL_FREE: 'Free',
    PRICE_LEVEL_INEXPENSIVE: '$',
    PRICE_LEVEL_MODERATE: '$$',
    PRICE_LEVEL_EXPENSIVE: '$$$',
    PRICE_LEVEL_VERY_EXPENSIVE: '$$$$',
  };

  return priceMap[priceLevel] || null;
}

function formatVenueArea(venue, cityKey) {
  const neighborhood = getVenueNeighborhood(venue, cityKey);
  const cityState = getAddressCityState(venue);
  if (neighborhood && cityState) return `${neighborhood}, ${cityState}`;
  return neighborhood || cityState || getShortAddress(venue);
}

function formatDistance(venue) {
  if (venue.distanceText) return venue.distanceText;
  const distance = venue.distanceMiles ?? venue.distanceMi ?? venue.distance;
  if (typeof distance !== 'number') return null;
  const rounded = Number.isInteger(distance) ? distance : Number(distance.toFixed(1));
  return `${rounded} mi`;
}

function formatOpenStatus(hours) {
  if (!hours || typeof hours.openNow !== 'boolean') return null;
  return hours.openNow ? 'Open' : 'Closed';
}

function formatClosingStatus(hours) {
  const closesAt = hours?.closesAt || hours?.closesAtLabel || hours?.closingTime;
  return closesAt ? `Closes ${closesAt}` : null;
}

function formatVenueStatusLine(venue) {
  const parts = [
    formatDistance(venue),
    formatOpenStatus(venue.hours),
    formatClosingStatus(venue.hours),
  ].filter(Boolean);

  return parts.length ? parts.join(' • ') : null;
}

function formatVenueMetadataLines(venue, cohortLabel, cityKey) {
  const detail = [formatPriceTier(venue.priceLevel), cohortLabel].filter(Boolean).join(' | ');

  return {
    detail,
    area: formatVenueArea(venue, cityKey),
    status: formatVenueStatusLine(venue),
  };
}

function formatVenueMetadata(venue, cohortLabel, cityKey) {
  const area = getVenueNeighborhood(venue, cityKey) || getShortAddress(venue);
  return [cohortLabel, area].filter(Boolean).join(' · ');
}

module.exports = {
  formatVenueMetadata,
  formatVenueMetadataLines,
  getVenueNeighborhood,
};
