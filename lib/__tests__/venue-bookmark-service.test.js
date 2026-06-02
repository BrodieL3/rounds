const {
  getBookmarkAsync,
  setBookmarkAsync,
  removeBookmarkAsync,
} = require('../venue-bookmark-service');

describe('venue bookmark service', () => {
  function makeDeps(overrides = {}) {
    const docs = {};
    return {
      docs,
      bookmarkRef: (uid, venueId) => ({ path: `users/${uid}/venueBookmarks/${venueId}` }),
      getDoc: async (ref) => {
        const data = docs[ref.path];
        return { exists: () => Boolean(data), data: () => data };
      },
      setDoc: async (ref, data) => {
        docs[ref.path] = data;
      },
      deleteDoc: async (ref) => {
        delete docs[ref.path];
      },
      ...overrides,
    };
  }

  test('getBookmark returns exists false when no doc', async () => {
    const deps = makeDeps();
    const result = await getBookmarkAsync('alice', 'v1', deps);
    expect(result.exists).toBe(false);
    expect(result.data).toBeNull();
  });

  test('getBookmark returns data when doc exists', async () => {
    const deps = makeDeps();
    deps.docs['users/alice/venueBookmarks/v1'] = { venueId: 'v1', venueName: 'Bar' };
    const result = await getBookmarkAsync('alice', 'v1', deps);
    expect(result.exists).toBe(true);
    expect(result.data.venueName).toBe('Bar');
  });

  test('setBookmark writes payload', async () => {
    const deps = makeDeps();
    const venue = { id: 'v1', name: 'Bar', city: 'nyc', cohort: 'cocktail_bar' };
    const result = await setBookmarkAsync('alice', venue, deps);
    expect(result.success).toBe(true);
    expect(deps.docs['users/alice/venueBookmarks/v1']).toMatchObject({
      venueId: 'v1',
      venueName: 'Bar',
      city: 'nyc',
      cohort: 'cocktail_bar',
    });
  });

  test('removeBookmark deletes doc', async () => {
    const deps = makeDeps();
    deps.docs['users/alice/venueBookmarks/v1'] = { venueId: 'v1' };
    const result = await removeBookmarkAsync('alice', 'v1', deps);
    expect(result.success).toBe(true);
    expect(deps.docs['users/alice/venueBookmarks/v1']).toBeUndefined();
  });

  test('returns error on set failure', async () => {
    const deps = makeDeps({
      setDoc: async () => { throw new Error('network'); },
    });
    const result = await setBookmarkAsync('alice', { id: 'v1', name: 'Bar', city: 'nyc', cohort: 'cocktail_bar' }, deps);
    expect(result.success).toBe(false);
    expect(result.error).toBe('network');
  });
});
