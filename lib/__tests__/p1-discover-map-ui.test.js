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

  test('venue detail renders a single-pin Apple map for venues with coordinates', () => {
    const src = read('app', 'venue', '[id]', 'index.js');
    expect(src).toContain("from 'react-native-maps'");
    expect(src).toContain('MapView');
    expect(src).toContain('<Marker');
    expect(src).toContain('latitude != null && longitude != null');
    // Apple Maps is the iOS default provider — assert we did not force Google.
    expect(src).not.toContain('PROVIDER_GOOGLE');
  });
});
