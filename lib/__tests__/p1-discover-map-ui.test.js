const fs = require('fs');
const path = require('path');

function read(...segments) {
  return fs.readFileSync(path.join(__dirname, '..', '..', ...segments), 'utf8');
}

describe('P1 Discover events + venue map wiring', () => {
  test('Discover queries tonight events with the (metro, startTime) index', () => {
    const src = read('app', '(tabs)', 'discover.js');
    expect(src).toContain("require('../../lib/feed-merge')");
    expect(src).toContain("require('../../lib/events/tonight-window')");
    expect(src).toContain('tonightWindow()');
    expect(src).toContain("collection(db, 'events')");
    expect(src).toContain("where('metro', '==', metro)");
    expect(src).toContain("where('startTime', '>=', startISO)");
    expect(src).toContain("orderBy('startTime', 'asc')");
  });

  test('Discover leads with tonight events via mergeFeed + the type discriminator', () => {
    const src = read('app', '(tabs)', 'discover.js');
    expect(src).toContain('mergeFeed({ posts: [], events })');
    expect(src).toContain("item.type === 'event'");
    expect(src).toContain('DiscoverEventCard');
    expect(src).toContain('buildEventItemDisplay');
    expect(src).toContain('TONIGHT');
  });

  test('venue detail uses the platform-split VenueMap (no direct native import)', () => {
    const src = read('app', 'venue', '[id]', 'index.js');
    expect(src).toContain("import VenueMap from '../../../components/VenueMap'");
    expect(src).toContain('<VenueMap');
    expect(src).toContain('latitude={latitude}');
    // The screen must NOT import react-native-maps directly — that breaks the web bundle.
    expect(src).not.toContain("from 'react-native-maps'");
  });

  test('native VenueMap renders a single Apple-Maps pin', () => {
    const src = read('components', 'VenueMap.js');
    expect(src).toContain("from 'react-native-maps'");
    expect(src).toContain('MapView');
    expect(src).toContain('<Marker');
    // Apple Maps is the iOS default provider — assert we did not force Google.
    expect(src).not.toContain('PROVIDER_GOOGLE');
  });

  test('web VenueMap stub never imports the native-only maps module', () => {
    const src = read('components', 'VenueMap.web.js');
    expect(src).not.toMatch(/from ['"]react-native-maps['"]/);
    expect(src).not.toContain("require('react-native-maps')");
    expect(src).toContain('buildOsmTileUrl');
    expect(src).toContain('ImageBackground');
    expect(src).toContain('OpenStreetMap');
    expect(src).not.toContain('Map available in the app');
  });
});
