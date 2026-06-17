const {
  buildLogConfirmation,
  SENTIMENT_LABELS,
} = require('../log-visit');

describe('log-visit confirmation (F3 slice 1 — the hero "it saved" signal)', () => {
  test('exposes human labels for all three canonical sentiments', () => {
    expect(SENTIMENT_LABELS).toEqual({
      loved: 'Loved it',
      fine: 'It was fine',
      disliked: "Didn't like it",
    });
  });

  test('builds a clear saved-confirmation title and message for a loved log', () => {
    const result = buildLogConfirmation('loved', 'City Winery');
    expect(result.title).toBe('Logged!');
    expect(result.message).toContain('City Winery');
    expect(result.message).toContain('Loved it');
    // It must read as a persistence confirmation, not a prompt.
    expect(result.message.toLowerCase()).toContain('saved');
  });

  test('builds confirmations for fine and disliked sentiments', () => {
    expect(buildLogConfirmation('fine', 'Sister Sorel').message).toContain('It was fine');
    expect(buildLogConfirmation('disliked', 'Sister Sorel').message).toContain("Didn't like it");
  });

  test('falls back gracefully when the venue name is missing', () => {
    const result = buildLogConfirmation('loved', '');
    expect(result.title).toBe('Logged!');
    expect(result.message.toLowerCase()).toContain('saved');
    // No "undefined"/"null"/empty-name leakage in the user-facing string.
    expect(result.message).not.toContain('undefined');
    expect(result.message).not.toContain('null');
  });

  test('throws on a non-canonical sentiment so the loop cannot confirm an invalid value', () => {
    expect(() => buildLogConfirmation('meh', 'City Winery')).toThrow();
  });
});
