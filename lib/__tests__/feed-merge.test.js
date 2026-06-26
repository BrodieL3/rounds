const { mergeFeed } = require('../feed-merge');

const NOW = new Date('2026-07-01T20:00:00.000Z');
const hoursFromNow = (h) => new Date(NOW.getTime() + h * 3600e3).toISOString();
const event = (id, h) => ({ id, title: `E-${id}`, startTime: hoursFromNow(h) });
const post = (id, createdAt) => ({ id, createdAt });

describe('mergeFeed (imminence-tier sort)', () => {
  test('puts tonight events ahead of all posts', () => {
    const out = mergeFeed({ posts: [post('p1', 9_999_999)], events: [event('e1', 2)], now: NOW });
    expect(out.map((x) => x.id)).toEqual(['e1', 'p1']);
  });

  test('orders tonight events soonest-first', () => {
    const out = mergeFeed({ events: [event('late', 3), event('soon', 1)], now: NOW });
    expect(out.map((x) => x.id)).toEqual(['soon', 'late']);
  });

  test('orders posts most-recent-first', () => {
    const out = mergeFeed({ posts: [post('old', 1000), post('new', 5000)], now: NOW });
    expect(out.map((x) => x.id)).toEqual(['new', 'old']);
  });

  test('excludes events that are not tonight (already started or days out)', () => {
    const out = mergeFeed({ events: [event('past', -2), event('on', 1), event('faraway', 48)], now: NOW });
    expect(out.map((x) => x.id)).toEqual(['on']);
  });

  test('tags item types: events as event, untyped posts as rating', () => {
    const out = mergeFeed({ posts: [post('p1', 1)], events: [event('e1', 1)], now: NOW });
    const type = Object.fromEntries(out.map((x) => [x.id, x.type]));
    expect(type.e1).toBe('event');
    expect(type.p1).toBe('rating');
  });

  test('preserves an explicit post type and handles ISO createdAt', () => {
    const out = mergeFeed({
      posts: [
        { id: 'b', createdAt: '2026-07-01T10:00:00.000Z', type: 'bookmark' },
        { id: 'a', createdAt: '2026-07-01T12:00:00.000Z' },
      ],
      now: NOW,
    });
    expect(out.map((x) => x.id)).toEqual(['a', 'b']); // a is more recent
    expect(out.find((x) => x.id === 'b').type).toBe('bookmark');
  });

  test('empty inputs produce an empty list', () => {
    expect(mergeFeed({ now: NOW })).toEqual([]);
  });
});
