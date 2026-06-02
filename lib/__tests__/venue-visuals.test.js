const {
  getVenueVisualFallback,
  formatOpenClosedStatus,
  formatVenueAverageScore,
} = require('../venue-visuals');

describe('venue visual helpers', () => {
  describe('getVenueVisualFallback', () => {
    test('returns deterministic gradient key from venue id', () => {
      const v1 = getVenueVisualFallback({ id: 'abc123', cohort: 'cocktail_bar' });
      const v2 = getVenueVisualFallback({ id: 'abc123', cohort: 'cocktail_bar' });
      expect(v1).toStrictEqual(v2);
      expect(v1).toHaveProperty('gradientKey');
      expect(v1).toHaveProperty('colors');
      expect(v1.colors).toHaveLength(2);
    });

    test('returns different gradients for different ids', () => {
      const v1 = getVenueVisualFallback({ id: 'abc', cohort: 'cocktail_bar' });
      const v2 = getVenueVisualFallback({ id: 'def', cohort: 'cocktail_bar' });
      expect(v1.gradientKey).not.toBe(v2.gradientKey);
    });

    test('returns cohort icon name', () => {
      const v = getVenueVisualFallback({ id: 'x', cohort: 'cocktail_bar' });
      expect(v).toHaveProperty('iconName');
      expect(typeof v.iconName).toBe('string');
    });
  });

  describe('formatOpenClosedStatus', () => {
    test('returns null when hours missing', () => {
      expect(formatOpenClosedStatus(null)).toBeNull();
      expect(formatOpenClosedStatus(undefined)).toBeNull();
    });

    test('returns null when openNow not boolean', () => {
      expect(formatOpenClosedStatus({ weekdayDescriptions: [] })).toBeNull();
    });

    test('returns Open with closesAt when openNow true', () => {
      expect(formatOpenClosedStatus({ openNow: true, closesAt: '11:00 PM' })).toBe('Open · Closes 11:00 PM');
    });

    test('returns Open without closesAt', () => {
      expect(formatOpenClosedStatus({ openNow: true })).toBe('Open');
    });

    test('returns Closed when openNow false', () => {
      expect(formatOpenClosedStatus({ openNow: false })).toBe('Closed');
    });
  });

  describe('formatVenueAverageScore', () => {
    test('returns null for empty ratings', () => {
      expect(formatVenueAverageScore([])).toBeNull();
    });

    test('returns loved percentage for single loved rating', () => {
      expect(formatVenueAverageScore([{ sentiment: 'loved' }])).toBe('100% loved');
    });

    test('returns mixed percentage for multiple sentiments', () => {
      const ratings = [
        { sentiment: 'loved' },
        { sentiment: 'loved' },
        { sentiment: 'fine' },
        { sentiment: 'disliked' },
      ];
      expect(formatVenueAverageScore(ratings)).toBe('50% loved');
    });

    test('rounds to nearest integer', () => {
      const ratings = [
        { sentiment: 'loved' },
        { sentiment: 'loved' },
        { sentiment: 'loved' },
        { sentiment: 'fine' },
        { sentiment: 'disliked' },
      ];
      expect(formatVenueAverageScore(ratings)).toBe('60% loved');
    });
  });
});
