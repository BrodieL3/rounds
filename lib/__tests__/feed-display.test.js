const {
  buildFeedItemDisplay,
  formatElapsedTime,
} = require('../feed-display');

describe('feed display helpers', () => {
  test('builds native timeline copy from a city post', () => {
    const display = buildFeedItemDisplay({
      id: 'post-1',
      displayName: 'Brodie',
      username: 'brodie',
      venueName: 'Double Chicken Please',
      cohort: 'cocktail_bar',
      neighborhood: 'Lower East Side',
      createdAt: new Date('2026-05-29T06:00:00Z'),
      rating: 8.3,
      description: 'Good vibe, lines get long after 11 PM.',
      likes: 12,
      savedBy: ['u1', 'u2'],
    }, 'nyc', new Date('2026-05-29T12:00:00Z'));

    expect(display.activity).toEqual({
      actor: 'Brodie',
      verb: 'ranked',
      venue: 'Double Chicken Please',
    });
    expect(display.metadata).toBe('🍸 Cocktail Lounge · Lower East Side · 6h ago');
    expect(display.ratingBadge).toBe('8.3');
    expect(display.notes).toBe('Good vibe, lines get long after 11 PM.');
    expect(display.engagement).toEqual({ likes: '12 likes', bookmarks: '2 bookmarks' });
  });

  test('formats elapsed time with an ago suffix for feed metadata', () => {
    expect(formatElapsedTime(new Date('2026-05-29T11:59:30Z'), new Date('2026-05-29T12:00:00Z'))).toBe('now');
    expect(formatElapsedTime(new Date('2026-05-29T11:54:00Z'), new Date('2026-05-29T12:00:00Z'))).toBe('6m ago');
    expect(formatElapsedTime(new Date('2026-05-28T10:00:00Z'), new Date('2026-05-29T12:00:00Z'))).toBe('1d ago');
  });
});
