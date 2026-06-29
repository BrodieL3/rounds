const { planIngest } = require('../ingest/plan-ingest');

const venue = { id: 'ovt:abc', name: 'The Sevens', cohort: 'pub', city: 'boston', latitude: 42.357, longitude: -71.07 };
const venueB = { id: 'ovt:xyz', name: 'Bar B', cohort: 'dive_bar', city: 'cambridge', latitude: 42.37, longitude: -71.1 };

describe('planIngest', () => {
  test('dedups identical occurrences scraped twice (incl. title drift) into one upsert', () => {
    const raw = { name: 'Trivia Night', start: '2026-07-01T23:00:00.000Z' };
    const { upserts } = planIngest([
      { raw, venue, source: 'eventbrite' },
      { raw: { ...raw, name: '  trivia   NIGHT! ' }, venue, source: 'eventbrite' },
    ]);
    expect(upserts).toHaveLength(1);
  });

  test('keeps distinct occurrences (different venue, title, or date)', () => {
    const { upserts } = planIngest([
      { raw: { name: 'Trivia', start: '2026-07-01T23:00:00Z' }, venue },
      { raw: { name: 'Trivia', start: '2026-07-01T23:00:00Z' }, venue: venueB },
      { raw: { name: 'Open Mic', start: '2026-07-01T23:00:00Z' }, venue },
    ]);
    expect(upserts).toHaveLength(3);
  });

  test('skips malformed items without failing the run, and reports why', () => {
    const { upserts, skipped } = planIngest([
      { raw: { name: 'Good', start: '2026-07-01T23:00:00Z' }, venue },
      { raw: { start: '2026-07-01T23:00:00Z' }, venue }, // no title
      { raw: { name: 'Bad date', start: 'nope' }, venue },
    ]);
    expect(upserts).toHaveLength(1);
    expect(skipped).toHaveLength(2);
    expect(skipped[0].error).toMatch(/title/);
  });

  test('upsert ids follow the deterministic dedup contract', () => {
    const { upserts } = planIngest([{ raw: { name: 'Trivia Night', start: '2026-07-01T23:00:00.000Z' }, venue }]);
    expect(upserts[0].id).toMatch(/^[0-9a-f]{20}$/);
  });
});
