const { createRatingWithProjectionAsync } = require('../ratings/rating-service');

describe('Rating creation service', () => {
  const user = { uid: 'user-1' };
  const profile = { username: 'brodie', displayName: 'Brodie', city: 'nyc' };
  const venue = { id: 'venue-1', name: 'Double Chicken Please', cohort: 'cocktail_bar' };

  function makeDeps(overrides = {}) {
    const batchSets = [];
    const commits = [];
    const deletes = [];
    return {
      batchSets,
      commits,
      deletes,
      db: 'db',
      serverTimestamp: () => 'SERVER_TIME',
      newRatingRef: () => ({ collectionName: 'ratings', id: 'rating-1' }),
      postRefForRating: (ratingId) => ({ collectionName: 'posts', id: ratingId }),
      writeBatch: () => ({
        set: (ref, payload) => batchSets.push({ ref, payload }),
        commit: async () => commits.push('commit'),
      }),
      uploadRatingPhotosAsync: async (ratingId, localUris) => ({
        success: true,
        paths: localUris.map((_, index) => `ratings/${ratingId}/photo_1700000000000_${index}.jpg`),
      }),
      deleteStoragePathsAsync: async (paths) => deletes.push(paths),
      ...overrides,
    };
  }

  test('creates a public Rating and deterministic Post projection in one batch', async () => {
    const deps = makeDeps();

    const result = await createRatingWithProjectionAsync({
      user,
      profile,
      venue,
      sentiment: 'loved',
      notes: ' Great martinis ',
      localPhotoUris: ['file:///a.jpg'],
    }, deps);

    expect(result).toEqual({
      success: true,
      ratingId: 'rating-1',
      mediaPaths: ['ratings/rating-1/photo_1700000000000_0.jpg'],
      postCreated: true,
    });
    expect(deps.commits).toEqual(['commit']);
    expect(deps.batchSets).toHaveLength(2);
    expect(deps.batchSets[0]).toMatchObject({
      ref: { collectionName: 'ratings', id: 'rating-1' },
      payload: {
        userId: 'user-1',
        venueId: 'venue-1',
        notes: 'Great martinis',
        mediaPaths: ['ratings/rating-1/photo_1700000000000_0.jpg'],
        visibility: 'public',
        createdAt: 'SERVER_TIME',
      },
    });
    expect(deps.batchSets[1]).toMatchObject({
      ref: { collectionName: 'posts', id: 'rating-1' },
      payload: {
        ratingId: 'rating-1',
        userId: 'user-1',
        visibility: 'public',
        likes: 0,
        likedBy: [],
        bookmarks: 0,
        bookmarkedBy: [],
      },
    });
    expect(deps.batchSets[0].payload).not.toHaveProperty('reviewId');
    expect(deps.batchSets[0].payload).not.toHaveProperty('description');
    expect(deps.batchSets[0].payload).not.toHaveProperty('mediaUrls');
    expect(deps.batchSets[1].payload).not.toHaveProperty('reviewId');
    expect(deps.batchSets[1].payload).not.toHaveProperty('postId');
    expect(deps.batchSets[1].payload).not.toHaveProperty('mediaUrls');
  });

  test('passes companionUids through to Rating and Post', async () => {
    const deps = makeDeps();

    const result = await createRatingWithProjectionAsync({
      user,
      profile,
      venue,
      sentiment: 'loved',
      companionUids: ['friend-1', 'friend-2'],
    }, deps);

    expect(result.success).toBe(true);
    expect(deps.batchSets[0].payload.companionUids).toEqual(['friend-1', 'friend-2']);
    expect(deps.batchSets[1].payload.companionUids).toEqual(['friend-1', 'friend-2']);
  });

  test('does not create a Post projection for unlisted Ratings', async () => {
    const deps = makeDeps();

    const result = await createRatingWithProjectionAsync({
      user,
      profile,
      venue,
      sentiment: 'fine',
      visibility: 'unlisted',
    }, deps);

    expect(result.success).toBe(true);
    expect(result.postCreated).toBe(false);
    expect(deps.batchSets).toHaveLength(1);
    expect(deps.batchSets[0].ref).toEqual({ collectionName: 'ratings', id: 'rating-1' });
  });

  test('aborts before Firestore writes when media upload fails', async () => {
    const deps = makeDeps({
      uploadRatingPhotosAsync: async () => ({ success: false, error: 'upload failed', paths: [] }),
    });

    const result = await createRatingWithProjectionAsync({
      user,
      profile,
      venue,
      sentiment: 'loved',
      localPhotoUris: ['file:///bad.jpg'],
    }, deps);

    expect(result).toEqual({ success: false, error: 'upload failed', ratingId: 'rating-1', mediaPaths: [] });
    expect(deps.batchSets).toEqual([]);
    expect(deps.commits).toEqual([]);
  });

  test('best-effort deletes uploaded media when the Firestore batch fails', async () => {
    const deps = makeDeps({
      writeBatch: () => ({
        set: (ref, payload) => deps.batchSets.push({ ref, payload }),
        commit: async () => { throw new Error('batch failed'); },
      }),
    });

    const result = await createRatingWithProjectionAsync({
      user,
      profile,
      venue,
      sentiment: 'loved',
      localPhotoUris: ['file:///a.jpg'],
    }, deps);

    expect(result.success).toBe(false);
    expect(result.error).toBe('batch failed');
    expect(deps.deletes).toEqual([['ratings/rating-1/photo_1700000000000_0.jpg']]);
  });
});
