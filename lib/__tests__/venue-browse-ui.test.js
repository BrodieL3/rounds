const fs = require('fs');
const path = require('path');

function read(...segments) {
  return fs.readFileSync(path.join(__dirname, '..', '..', ...segments), 'utf8');
}

// F3 slice 2 (browse/find): the cold-start fix. A brand-new user with ZERO
// posts and ZERO friends must FIND a bar to log. The browsable seeded catalog
// (not only the empty `posts` feed) now lives on the My List tab — Discover was
// intentionally emptied — and every row must navigate to the venue detail where
// slice-1's "Log a visit" already works. No JSX/RTL transform in this repo →
// source-contract assertions, matching venue-detail-ui / log-visit-loop-ui.

describe('My List — browsable seeded catalog (cold-start fix)', () => {
  const source = read('app', '(tabs)', 'list.js');

  test('renders the seeded venue catalog from the pure lib, not only the posts feed', () => {
    expect(source).toContain("require('../../lib/venue-catalog')");
    expect(source).toContain('buildVenueCatalog');
    expect(source).toContain("require('../../assets/venues.json')");
  });

  test('does NOT gate the catalog on profile.city (a new user has no city set)', () => {
    // The old feed early-returned on `!profile?.city`, which is exactly the
    // cold-start death. The catalog must be built unconditionally from the seed
    // (a useMemo with no auth/profile dependency), so it renders even when a
    // brand-new user has no city. The posts subscription may still scope by
    // city — that is the social feed, not the browse surface.
    const catalogBuild = source.indexOf('buildVenueCatalog(VENUE_DATA)');
    expect(catalogBuild).toBeGreaterThan(-1);
    // The catalog memo depends only on the static seed, never on profile.city.
    expect(source).toContain('useMemo(() => buildVenueCatalog(VENUE_DATA), [])');
  });

  test('uses a SectionList grouped by city (Boston / Cambridge) for a scannable browse', () => {
    expect(source).toContain('SectionList');
    expect(source).toContain('renderSectionHeader');
  });

  test('reuses the 05-themed VenueRow component for each venue', () => {
    expect(source).toContain("import VenueRow from '../../components/VenueRow'");
    expect(source).toContain('<VenueRow');
  });

  test('every venue row navigates to the venue detail (where Log a visit lives)', () => {
    expect(source).toContain('/venue/${');
  });

  test('exposes inline search so users can also find by name', () => {
    // Search now filters the seed in place on this screen (was a push to /search).
    expect(source).toContain('searchVenues');
    expect(source).toContain('<TextInput');
  });

  test('surfaces the ODbL attribution in-app (ISC-11)', () => {
    expect(source).toContain('getAttribution');
  });

  test('uses COLORS tokens, never the legacy light feed hairline', () => {
    expect(source).toContain('COLORS');
    expect(source).not.toContain("borderBottomColor: '#f3f4f6'");
  });
});

describe('Search — filters the seeded venues, not only users', () => {
  const source = read('app', 'search.js');

  test('searches the seeded venue catalog (ISC-22), wired to the pure lib', () => {
    expect(source).toContain("require('../lib/venue-catalog')");
    expect(source).toContain('searchVenues');
    expect(source).toContain("require('../assets/venues.json')");
  });

  test('a venue result navigates to the venue detail, not a user profile', () => {
    expect(source).toContain('/venue/${');
  });

  test('reuses the 05-themed VenueRow for venue results', () => {
    expect(source).toContain("import VenueRow from '../components/VenueRow'");
  });

  test('does not require Firestore to find a bar (client-side over the seed)', () => {
    // The cold-start path must not depend on a network query to find a venue.
    // The previous implementation queried the `users` collection; venue search
    // is purely client-side over the bundled seed.
    expect(source).toContain('flattenCatalogVenues');
  });
});
