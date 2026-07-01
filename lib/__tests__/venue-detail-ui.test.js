const fs = require('fs');
const path = require('path');

function read(...segments) {
  return fs.readFileSync(path.join(__dirname, '..', '..', ...segments), 'utf8');
}

describe('Venue detail UI wiring', () => {
  const source = read('app', 'venue', '[id]', 'index.js');

  test('uses deterministic visual fallback for hero', () => {
    expect(source).toContain('getVenueVisualFallback');
    expect(source).toContain('visual.colors[0]');
    expect(source).toContain('visual.iconName');
  });

  test('has Website and Directions action buttons', () => {
    expect(source).toContain('Website');
    expect(source).toContain('Directions');
    expect(source).toContain('openWebsite');
    expect(source).toContain('openMap');
  });

  test('shows open/closed status from hours', () => {
    expect(source).toContain('formatOpenClosedStatus');
    expect(source).toContain('openStatus');
  });

  test('queries recent public Ratings for popular posts', () => {
    expect(source).toContain("collection(db, 'ratings')");
    expect(source).toContain("where('venueId', '==', venue.id)");
    expect(source).toContain("where('visibility', '==', 'public')");
  });

  test('queries upcoming venue events and renders them on the venue page', () => {
    expect(source).toContain("collection(db, 'events')");
    expect(source).toContain("where('venueId', '==', venue.id)");
    expect(source).toContain('buildEventItemDisplay');
    expect(source).toContain('Upcoming events');
  });

  test('normalizes coordinates before rendering maps or directions', () => {
    expect(source).toContain('getVenueCoordinates');
    expect(source).toContain('coordinates?.latitude');
    expect(source).toContain('coordinates?.longitude');
  });

  test('shows average score from public Ratings', () => {
    expect(source).toContain('formatVenueAverageScore');
  });

  test('wires bookmark to venue bookmark service', () => {
    expect(source).toContain('getBookmarkAsync');
    expect(source).toContain('setBookmarkAsync');
    expect(source).toContain('removeBookmarkAsync');
  });

  test('does not write legacy reviews collection', () => {
    expect(source).not.toContain("collection(db, 'reviews')");
  });
});

describe('Venue row UI wiring', () => {
  const source = read('components', 'VenueRow.js');

  test('uses COLORS tokens instead of hardcoded light colors', () => {
    expect(source).toContain("import { COLORS");
    expect(source).not.toContain("color: '#111111'");
    expect(source).not.toContain("color: '#6b7280'");
    expect(source).not.toContain("borderBottomColor: '#e5e7eb'");
  });

  test('has thumbnail with visual fallback', () => {
    expect(source).toContain('getVenueVisualFallback');
    expect(source).toContain('styles.thumb');
  });

  test('has tappable bookmark action', () => {
    expect(source).toContain('bookmarked');
    expect(source).toContain('onBookmarkPress');
    expect(source).toContain('bookmark-outline');
    expect(source).toContain('bookmark');
  });

  test('removes confusing cosmetic-only add/dismiss icons', () => {
    expect(source).not.toContain('name="add"');
    expect(source).not.toContain('name="close"');
  });
});

describe('Rate screen UI wiring', () => {
  const source = read('app', 'venue', '[id]', 'rate.js');

  test('shows venue thumbnail fallback', () => {
    expect(source).toContain('getVenueVisualFallback');
    expect(source).toContain('styles.venueThumb');
  });

  test('shows review preview before submit', () => {
    expect(source).toContain('Preview');
    expect(source).toContain('styles.previewCard');
    expect(source).toContain('sentiment');
    expect(source).toContain('photos.length');
  });
});
