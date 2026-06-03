const { normalizeMediaImageSource } = require('../media-image-source');

describe('normalizeMediaImageSource', () => {
  test('keeps existing native image source objects unchanged', () => {
    const source = { uri: 'https://example.com/review.jpg', cacheKey: 'review-1' };

    expect(normalizeMediaImageSource(source)).toBe(source);
  });

  test('turns URI strings into native image source objects', () => {
    expect(normalizeMediaImageSource('https://example.com/avatar.jpg')).toEqual({
      uri: 'https://example.com/avatar.jpg',
    });
  });

  test('keeps empty sources empty so callers can render placeholders', () => {
    expect(normalizeMediaImageSource(null)).toBeNull();
    expect(normalizeMediaImageSource(undefined)).toBeUndefined();
  });
});
