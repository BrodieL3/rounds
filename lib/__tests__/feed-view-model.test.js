const {
  buildFeedViewItems,
  createSeedVenueLookup,
} = require('../feed-view-model');

const venueSeed = {
  cities: {
    nyc: {
      venues: [
        {
          id: 'venue-nyc',
          name: 'Seed NYC Bar',
          cohort: 'cocktail_bar',
          neighborhood: 'Seed Village',
        },
      ],
    },
    boston: {
      venues: [
        {
          id: 'venue-bos',
          name: 'Seed Boston Bar',
          cohort: 'pub',
          location: { latitude: 42.3507605, longitude: -71.044334 },
        },
      ],
    },
  },
};

function ts(value) {
  return { toDate: () => new Date(value) };
}

describe('feed view model', () => {
  test('enriches city-scoped post docs with seed venue fallback and elapsed-time input', () => {
    const items = buildFeedViewItems({
      posts: [{ id: 'p1', userId: 'stranger', city: 'nyc', venueId: 'venue-nyc', createdAt: ts('2026-06-05T10:00:00Z') }],
      city: 'nyc',
      following: [],
      venueLookup: createSeedVenueLookup(venueSeed),
      now: new Date('2026-06-05T12:00:00Z'),
    });

    expect(items).toEqual([
      expect.objectContaining({
        id: 'p1',
        venueName: 'Seed NYC Bar',
        neighborhood: 'Seed Village',
        source: 'city',
        timeAgo: '2h ago',
      }),
    ]);
  });

  test('promotes followed users above city posts while preserving newest-first within each source', () => {
    const items = buildFeedViewItems({
      posts: [
        { id: 'city-new', userId: 'stranger', city: 'nyc', createdAt: ts('2026-06-05T11:00:00Z') },
        { id: 'friend-old', userId: 'friend', city: 'nyc', createdAt: ts('2026-06-05T09:00:00Z') },
        { id: 'friend-new', userId: 'friend', city: 'nyc', createdAt: ts('2026-06-05T10:00:00Z') },
      ],
      city: 'nyc',
      following: ['friend'],
      now: new Date('2026-06-05T12:00:00Z'),
    });

    expect(items.map((item) => [item.id, item.source])).toEqual([
      ['friend-new', 'friend'],
      ['friend-old', 'friend'],
      ['city-new', 'city'],
    ]);
  });

  test('uses post city for seeded venue lookup and keeps existing post labels', () => {
    const items = buildFeedViewItems({
      posts: [{
        id: 'p1',
        userId: 'friend',
        city: 'boston',
        venueId: 'venue-bos',
        venueName: 'Posted Name',
        neighborhood: 'Posted Area',
        createdAt: '2026-06-05T11:59:30Z',
      }],
      city: 'nyc',
      following: ['friend'],
      venueLookup: createSeedVenueLookup(venueSeed),
      now: new Date('2026-06-05T12:00:00Z'),
    });

    expect(items[0]).toEqual(expect.objectContaining({
      venueName: 'Posted Name',
      neighborhood: 'Posted Area',
      source: 'friend',
      timeAgo: 'now',
    }));
  });
});
