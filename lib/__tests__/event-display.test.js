const { buildEventItemDisplay, formatStartTime } = require('../events/event-display');

const baseEvent = {
  title: 'Jazz Night',
  venueName: 'The Beehive',
  category: 'live_music',
  cohort: 'cocktail_bar',
  city: 'boston',
  startTime: '2026-06-30T01:30:00.000Z',
};

describe('buildEventItemDisplay', () => {
  test('maps category to a human label and icon', () => {
    const d = buildEventItemDisplay(baseEvent);
    expect(d.categoryLabel).toBe('Live Music');
    expect(d.icon).toBe('🎸');
  });

  test('passes through title and venue name', () => {
    const d = buildEventItemDisplay(baseEvent);
    expect(d.title).toBe('Jazz Night');
    expect(d.venueName).toBe('The Beehive');
  });

  test('surfaces lineup, genres, and price when ingestion has real source data', () => {
    const d = buildEventItemDisplay({
      ...baseEvent,
      lineup: ['DJ Test', 'MC Example'],
      genres: ['House', 'Techno'],
      price: '$15',
    });
    expect(d.lineupLabel).toBe('DJ Test, MC Example');
    expect(d.genreLabel).toBe('House, Techno');
    expect(d.priceLabel).toBe('$15');
  });

  test('metadata combines category, cohort, and area — and excludes the clock time', () => {
    const d = buildEventItemDisplay(baseEvent);
    expect(d.metadata).toContain('Live Music');
    expect(d.metadata).toContain('Cocktail Lounge');
    expect(d.metadata).toContain('Boston');
    expect(d.metadata).not.toMatch(/AM|PM/);
  });

  test('time is a separate clock label', () => {
    const d = buildEventItemDisplay(baseEvent);
    expect(d.time).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/);
  });

  test('unknown category falls back to a generic label + icon', () => {
    const d = buildEventItemDisplay({ ...baseEvent, category: 'mystery' });
    expect(d.categoryLabel).toBe('Event');
    expect(d.icon).toBe('🎶');
  });

  test('labels source quality so seeded samples do not masquerade as verified events', () => {
    expect(buildEventItemDisplay({ ...baseEvent, source: 'manual-seed' }).sourceLabel)
      .toBe('Beta sample');
    expect(buildEventItemDisplay({ ...baseEvent, source: 'venue-site' }).sourceLabel)
      .toBe('Venue calendar');
  });

  test('tolerates a fully empty event', () => {
    const d = buildEventItemDisplay({});
    expect(d.title).toBe('Live tonight');
    expect(d.venueName).toBe('a venue');
    expect(d.metadata).toBe('Event');
  });
});

describe('formatStartTime', () => {
  test('returns empty string for missing or invalid input', () => {
    expect(formatStartTime()).toBe('');
    expect(formatStartTime('not-a-date')).toBe('');
  });

  test('formats an ISO timestamp as h:mm AM/PM', () => {
    expect(formatStartTime('2026-06-30T01:30:00.000Z')).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/);
  });
});
