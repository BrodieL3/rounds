const { buildOsmTileUrl, buildOsmMapUrl } = require('../osm-static-map');

describe('osm static map helpers', () => {
  test('builds a deterministic OpenStreetMap tile URL for valid coordinates', () => {
    const url = buildOsmTileUrl({ latitude: 42.355, longitude: -71.064, zoom: 16 });
    expect(url).toMatch(/^https:\/\/tile\.openstreetmap\.org\/16\/\d+\/\d+\.png$/);
  });

  test('builds a clickable OpenStreetMap URL centered on the venue', () => {
    const url = buildOsmMapUrl({ latitude: 42.355, longitude: -71.064, zoom: 16 });
    expect(url).toBe('https://www.openstreetmap.org/?mlat=42.355&mlon=-71.064#map=16/42.355/-71.064');
  });

  test('returns null for invalid coordinates', () => {
    expect(buildOsmTileUrl({ latitude: '42', longitude: -71.064 })).toBeNull();
    expect(buildOsmMapUrl({ latitude: 42.355, longitude: Infinity })).toBeNull();
  });
});
