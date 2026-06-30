const {
  buildStopPayload,
  shouldPromptRating,
} = require('../stops');

describe('buildStopPayload — one-tap Stop, decoupled from Rating (ADR 010 §4)', () => {
  const base = {
    userId: 'u1',
    venue: { id: 'v1', cohort: 'cocktail_bar', city: 'cambridge' },
    createdAt: 123,
  };

  test('builds a check-in carrying venue identity and timestamp', () => {
    expect(buildStopPayload(base)).toMatchObject({
      userId: 'u1',
      venueId: 'v1',
      cohort: 'cocktail_bar',
      createdAt: 123,
    });
  });

  test('is sentiment-free — a Stop is not a Rating', () => {
    const stop = buildStopPayload(base);
    expect(stop).not.toHaveProperty('sentiment');
    expect(stop).not.toHaveProperty('notes');
    expect(stop).not.toHaveProperty('visibility');
  });

  test('derives metro from the venue city (ADR 007)', () => {
    expect(buildStopPayload(base).metro).toBe('boston');
  });

  test('requires userId, a venue with an id, and createdAt', () => {
    expect(() => buildStopPayload({ ...base, userId: undefined })).toThrow();
    expect(() => buildStopPayload({ ...base, venue: undefined })).toThrow();
    expect(() => buildStopPayload({ ...base, venue: { cohort: 'x' } })).toThrow();
    expect(() => buildStopPayload({ ...base, createdAt: undefined })).toThrow();
  });
});

describe('shouldPromptRating — stops feed the rate-prompt cadence (ADR 010 §4)', () => {
  test('prompts once enough un-rated stops accumulate', () => {
    expect(shouldPromptRating({ stopCount: 3, hasRating: false, threshold: 3 })).toBe(true);
  });

  test('never prompts a venue the user has already rated', () => {
    expect(shouldPromptRating({ stopCount: 9, hasRating: true, threshold: 3 })).toBe(false);
  });

  test('does not prompt below the threshold', () => {
    expect(shouldPromptRating({ stopCount: 1, hasRating: false, threshold: 3 })).toBe(false);
  });
});
