const {
  buildBookmarkPayload,
  getBookmarkDocPath,
} = require('../venue-bookmarks');

describe('venue bookmark helpers', () => {
  describe('buildBookmarkPayload', () => {
    test('builds payload with required fields', () => {
      const payload = buildBookmarkPayload({
        venueId: 'v123',
        venueName: 'Starbucks',
        city: 'nyc',
        cohort: 'cocktail_bar',
      });

      expect(payload).toEqual({
        venueId: 'v123',
        venueName: 'Starbucks',
        city: 'nyc',
        cohort: 'cocktail_bar',
        createdAt: expect.any(Number),
      });
    });

    test('throws if required fields missing', () => {
      expect(() => buildBookmarkPayload({})).toThrow();
      expect(() => buildBookmarkPayload({ venueId: 'v123' })).toThrow();
    });
  });

  describe('getBookmarkDocPath', () => {
    test('returns deterministic path', () => {
      expect(getBookmarkDocPath('uid123', 'v456')).toBe('users/uid123/venueBookmarks/v456');
    });
  });
});
