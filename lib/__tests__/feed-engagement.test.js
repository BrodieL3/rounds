const {
  buildPostBookmarkUpdate,
  buildPostLikeUpdate,
  buildReviewShareParams,
  isPostBookmarkedBy,
  isPostLikedBy,
} = require('../feed-engagement');

describe('feed engagement helpers', () => {
  test('builds self-only like add/remove updates with derived counts', () => {
    expect(buildPostLikeUpdate({ likedBy: [], likes: 0 }, 'alice')).toEqual({
      likedBy: ['alice'],
      likes: 1,
    });

    expect(buildPostLikeUpdate({ likedBy: ['alice', 'bob'], likes: 2 }, 'alice')).toEqual({
      likedBy: ['bob'],
      likes: 1,
    });
  });

  test('builds saved-review bookmark updates separate from venue bookmarks', () => {
    expect(buildPostBookmarkUpdate({ bookmarkedBy: ['bob'], bookmarks: 1 }, 'alice')).toEqual({
      bookmarkedBy: ['bob', 'alice'],
      bookmarks: 2,
    });

    expect(buildPostBookmarkUpdate({ bookmarkedBy: ['alice'], bookmarks: 1 }, 'alice')).toEqual({
      bookmarkedBy: [],
      bookmarks: 0,
    });
  });

  test('detects current user post engagement state', () => {
    const post = { likedBy: ['alice'], bookmarkedBy: ['bob'] };

    expect(isPostLikedBy(post, 'alice')).toBe(true);
    expect(isPostLikedBy(post, 'bob')).toBe(false);
    expect(isPostBookmarkedBy(post, 'bob')).toBe(true);
    expect(isPostBookmarkedBy(post, 'alice')).toBe(false);
  });

  test('builds review-share params from canonical rating identity', () => {
    expect(buildReviewShareParams({
      id: 'post-doc',
      ratingId: 'rating-1',
      venueId: 'venue-1',
      venueName: 'Good Bar',
      cohort: 'cocktail_bar',
      sentiment: 'loved',
      displayName: 'Alice',
      username: 'alice',
      notes: 'great',
      visibility: 'public',
    })).toEqual({
      ratingId: 'rating-1',
      venueId: 'venue-1',
      venueName: 'Good Bar',
      venueCohort: 'cocktail_bar',
      sentiment: 'loved',
      authorDisplayName: 'Alice',
      authorUsername: 'alice',
      notes: 'great',
      visibility: 'public',
    });
  });
});
