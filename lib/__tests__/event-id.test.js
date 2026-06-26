const { slug, buildEventId } = require('../events/event-id');

describe('slug', () => {
  test('lowercases and hyphenates words', () => {
    expect(slug('Trivia Night')).toBe('trivia-night');
  });

  test('is insensitive to case, punctuation, and surrounding whitespace', () => {
    expect(slug('  TRIVIA   night!! ')).toBe('trivia-night');
    expect(slug('Trivia Night')).toBe(slug('trivia night'));
    expect(slug('Live Music: Jazz Trio')).toBe('live-music-jazz-trio');
  });

  test('strips diacritics so accented titles normalize', () => {
    expect(slug('Café Sesh')).toBe('cafe-sesh');
  });

  test('normalizes form, not meaning — distinct wordings stay distinct', () => {
    expect(slug('Trivia Night')).not.toBe(slug('Trivia'));
  });

  test('throws on a non-string title', () => {
    expect(() => slug(42)).toThrow();
  });
});

describe('buildEventId', () => {
  const base = { venueId: 'ovt:abc', localDate: '2026-07-01', title: 'Trivia Night' };

  test('is deterministic for identical inputs', () => {
    expect(buildEventId(base)).toBe(buildEventId({ ...base }));
  });

  test('is stable across title formatting drift (the dedup contract)', () => {
    expect(buildEventId(base)).toBe(buildEventId({ ...base, title: '  trivia   NIGHT! ' }));
  });

  test('differs when venue, date, or title differ', () => {
    const id = buildEventId(base);
    expect(buildEventId({ ...base, venueId: 'ovt:xyz' })).not.toBe(id);
    expect(buildEventId({ ...base, localDate: '2026-07-02' })).not.toBe(id);
    expect(buildEventId({ ...base, title: 'Open Mic' })).not.toBe(id);
  });

  test('returns a 20-char hex id', () => {
    expect(buildEventId(base)).toMatch(/^[0-9a-f]{20}$/);
  });

  test('requires venueId, localDate, and title', () => {
    expect(() => buildEventId({ ...base, venueId: undefined })).toThrow(/venueId/);
    expect(() => buildEventId({ ...base, localDate: undefined })).toThrow(/localDate/);
    expect(() => buildEventId({ ...base, title: undefined })).toThrow(/title/);
  });
});
