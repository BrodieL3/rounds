const DEFAULT_ZOOM = 16;

function validCoordinate(latitude, longitude) {
  return (
    typeof latitude === 'number'
    && Number.isFinite(latitude)
    && typeof longitude === 'number'
    && Number.isFinite(longitude)
    && latitude >= -85.05112878
    && latitude <= 85.05112878
    && longitude >= -180
    && longitude <= 180
  );
}

function tileForCoordinate(latitude, longitude, zoom = DEFAULT_ZOOM) {
  if (!validCoordinate(latitude, longitude)) return null;
  const scale = 2 ** zoom;
  const latRad = latitude * Math.PI / 180;
  const x = Math.floor((longitude + 180) / 360 * scale);
  const y = Math.floor(
    (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * scale
  );
  return { zoom, x, y };
}

function buildOsmTileUrl({ latitude, longitude, zoom = DEFAULT_ZOOM } = {}) {
  const tile = tileForCoordinate(latitude, longitude, zoom);
  if (!tile) return null;
  return `https://tile.openstreetmap.org/${tile.zoom}/${tile.x}/${tile.y}.png`;
}

function buildOsmMapUrl({ latitude, longitude, zoom = DEFAULT_ZOOM } = {}) {
  if (!validCoordinate(latitude, longitude)) return null;
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=${zoom}/${latitude}/${longitude}`;
}

module.exports = { buildOsmTileUrl, buildOsmMapUrl, tileForCoordinate };
