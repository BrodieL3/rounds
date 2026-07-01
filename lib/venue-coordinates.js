function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getVenueCoordinates(venue = {}) {
  const latitude = finiteNumber(
    venue.location?.latitude ?? venue.latitude ?? venue.lat
  );
  const longitude = finiteNumber(
    venue.location?.longitude ?? venue.longitude ?? venue.lng
  );

  if (latitude === null || longitude === null) return null;
  return { latitude, longitude };
}

module.exports = { getVenueCoordinates };
