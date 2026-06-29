// Pure. Check-in eligibility: is the user within range of the venue? Lenient by
// design (150m default) — Boston urban GPS error is 50–100m. Reuses geo.js
// haversine, which returns null for invalid points. Firebase-free.

const { haversineMeters } = require('../geo');

function isWithinCheckinRange(user, venue, radiusMeters = 150) {
  const distance = haversineMeters(user, venue);
  return distance !== null && distance <= radiusMeters;
}

module.exports = { isWithinCheckinRange };
