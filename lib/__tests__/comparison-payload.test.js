const {
  buildComparisonPayload,
  newSessionId,
  COMPARISON_SCHEMA_VERSION,
  VALID_CONTEXTS,
} = require('../comparisons/comparison-payload');

describe('buildComparisonPayload (ADR 009 §5 schema)', () => {
  const base = {
    userId: 'u1',
    cohort: 'cocktail_bar',
    venueA: 'vA',
    venueB: 'vB',
    result: 'vA',
    sessionId: 's1',
    sequence: 0,
    createdAt: 123,
  };

  test('stamps schemaVersion 2 and carries every ADR-009 field', () => {
    const p = buildComparisonPayload({
      ...base, city: 'cambridge', sentimentA: 'loved', sentimentB: 'fine',
    });
    expect(p.schemaVersion).toBe(2);
    expect(COMPARISON_SCHEMA_VERSION).toBe(2);
    expect(p).toMatchObject({
      userId: 'u1', cohort: 'cocktail_bar', venueA: 'vA', venueB: 'vB', result: 'vA',
      sentimentA: 'loved', sentimentB: 'fine', city: 'cambridge', metro: 'boston',
      sessionId: 's1', sequence: 0, context: 'pairwise', createdAt: 123,
    });
  });

  test('records cohort at capture time (not derived from venue place-type)', () => {
    // cohort is taken verbatim from the lens the user was in
    expect(buildComparisonPayload({ ...base, cohort: 'dive_bar' }).cohort).toBe('dive_bar');
  });

  test('derives metro from city via the ADR-007 map', () => {
    expect(buildComparisonPayload({ ...base, city: 'cambridge' }).metro).toBe('boston');
    expect(buildComparisonPayload({ ...base, city: 'boston' }).metro).toBe('boston');
    expect(buildComparisonPayload({ ...base, city: 'nowhere' }).metro).toBeNull();
  });

  test('explicit metro overrides derivation', () => {
    expect(buildComparisonPayload({ ...base, city: 'cambridge', metro: 'nyc' }).metro).toBe('nyc');
  });

  test('accepts the too-tough draw outcome', () => {
    expect(buildComparisonPayload({ ...base, result: 'too-tough' }).result).toBe('too-tough');
  });

  test('defaults sentiments/city/metro to null when absent', () => {
    const p = buildComparisonPayload(base);
    expect(p.sentimentA).toBeNull();
    expect(p.sentimentB).toBeNull();
    expect(p.city).toBeNull();
    expect(p.metro).toBeNull();
  });

  test.each([
    ['missing userId', { ...base, userId: undefined }],
    ['missing cohort', { ...base, cohort: '' }],
    ['identical venues', { ...base, venueB: 'vA' }],
    ['result not a participant', { ...base, result: 'vZ' }],
    ['invalid context', { ...base, context: 'nope' }],
    ['missing sessionId', { ...base, sessionId: undefined }],
    ['negative sequence', { ...base, sequence: -1 }],
    ['non-integer sequence', { ...base, sequence: 1.5 }],
    ['missing createdAt', { ...base, createdAt: undefined }],
    ['invalid sentimentA', { ...base, sentimentA: 'meh' }],
    ['invalid sentimentB', { ...base, sentimentB: 'great' }],
  ])('throws on %s', (_label, input) => {
    expect(() => buildComparisonPayload(input)).toThrow();
  });
});

describe('comparison-log support', () => {
  test('newSessionId is prefixed and unique across calls', () => {
    const a = newSessionId();
    expect(a).toMatch(/^cmp_/);
    expect(a).not.toBe(newSessionId());
  });

  test('VALID_CONTEXTS enumerates the three intents (outcome stays in result)', () => {
    expect(VALID_CONTEXTS).toEqual(['pairwise', 'placement-search', 'organic-rerank']);
  });
});
