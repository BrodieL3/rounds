const EARTH_RADIUS_METERS = 6371000;
const METERS_PER_MILE = 1609.344;

function isValidPoint(point) {
  if (!point) return false;
  if (typeof point.latitude !== 'number') return false;
  if (typeof point.longitude !== 'number') return false;
  return Number.isFinite(point.latitude) && Number.isFinite(point.longitude);
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function haversineMeters(a, b) {
  if (!isValidPoint(a) || !isValidPoint(b)) return null;

  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const deltaLat = toRadians(b.latitude - a.latitude);
  const deltaLng = toRadians(b.longitude - a.longitude);

  const sinLat = Math.sin(deltaLat / 2);
  const sinLng = Math.sin(deltaLng / 2);
  const haversine = sinLat * sinLat
    + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  const centralAngle = 2 * Math.atan2(
    Math.sqrt(clamp(haversine, 0, 1)),
    Math.sqrt(clamp(1 - haversine, 0, 1))
  );

  return EARTH_RADIUS_METERS * centralAngle;
}

function copyWithDistance(venue, distanceMeters) {
  return {
    ...venue,
    distanceMeters,
  };
}

function sortVenuesByDistance(venues, origin) {
  if (!Array.isArray(venues)) return [];

  if (!isValidPoint(origin)) {
    return venues.map((venue) => copyWithDistance(venue, null));
  }

  return venues
    .map((venue, index) => {
      const distanceMeters = isValidPoint(venue)
        ? haversineMeters(origin, venue)
        : null;

      return {
        venue: copyWithDistance(venue, distanceMeters),
        distanceMeters,
        index,
      };
    })
    .sort((a, b) => {
      if (a.distanceMeters === null && b.distanceMeters === null) return a.index - b.index;
      if (a.distanceMeters === null) return 1;
      if (b.distanceMeters === null) return -1;
      if (a.distanceMeters === b.distanceMeters) return a.index - b.index;
      return a.distanceMeters - b.distanceMeters;
    })
    .map((entry) => entry.venue);
}

function formatDistance(meters) {
  if (meters === null || meters === undefined) return '';
  if (typeof meters !== 'number' || !Number.isFinite(meters)) return '';
  if (meters < 0) return '';

  if (meters < 1000) {
    const roundedMeters = meters < 10
      ? Math.round(meters)
      : Math.round(meters / 10) * 10;
    return `${roundedMeters} m`;
  }

  return `${(meters / METERS_PER_MILE).toFixed(1)} mi`;
}

module.exports = {
  haversineMeters,
  sortVenuesByDistance,
  formatDistance,
};
