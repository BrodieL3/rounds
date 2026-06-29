const { buildSourceRegistry } = require('../ingest/source-registry');

const entries = [
  { venueId: 'ovt:a', eventbrite: 'https://eventbrite.com/o/a' },
  { venueId: 'ovt:b', site: 'https://barb.com/events' },
];

describe('buildSourceRegistry', () => {
  test('looks up a curated venue source', () => {
    const reg = buildSourceRegistry(entries);
    expect(reg.get('ovt:a').eventbrite).toBe('https://eventbrite.com/o/a');
    expect(reg.has('ovt:b')).toBe(true);
    expect(reg.size).toBe(2);
  });

  test('returns null for an unknown venue', () => {
    expect(buildSourceRegistry(entries).get('ovt:z')).toBeNull();
  });

  test('lists all entries', () => {
    expect(buildSourceRegistry(entries).list()).toHaveLength(2);
  });

  test('rejects an entry without a venueId', () => {
    expect(() => buildSourceRegistry([{ eventbrite: 'x' }])).toThrow(/venueId/);
  });

  test('rejects an entry with no source url', () => {
    expect(() => buildSourceRegistry([{ venueId: 'ovt:a' }])).toThrow(/url/);
  });
});
