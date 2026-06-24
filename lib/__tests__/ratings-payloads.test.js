const fs = require('fs');
const path = require('path');
const {
  buildRatingCreation,
  buildRatingPayload,
  buildPostProjection,
  shouldCreatePostProjection,
} = require('../ratings/rating-payloads');

describe('Rating payload builders', () => {
  const user = { uid: 'user-1' };
  const profile = {
    username: 'brodie',
    displayName: 'Brodie',
    photoURL: 'https://avatar.test/u1.jpg',
    city: 'nyc',
  };
  const venue = {
    id: 'venue-1',
    name: 'Double Chicken Please',
    cohort: 'cocktail_bar',
    city: 'boston',
  };

  test('builds a canonical public Rating and Post projection without legacy review fields', () => {
    const createdAt = { seconds: 1 };
    const creation = buildRatingCreation({
      ratingId: 'rating-1',
      user,
      profile,
      venue,
      sentiment: 'loved',
      notes: '  Great martinis.  ',
      mediaPaths: ['ratings/rating-1/photo_1700000000000_0.jpg'],
      createdAt,
    });

    expect(creation.rating).toEqual({
      userId: 'user-1',
      username: 'brodie',
      displayName: 'Brodie',
      userPhotoURL: 'https://avatar.test/u1.jpg',
      venueId: 'venue-1',
      venueName: 'Double Chicken Please',
      cohort: 'cocktail_bar',
      sentiment: 'loved',
      notes: 'Great martinis.',
      mediaPaths: ['ratings/rating-1/photo_1700000000000_0.jpg'],
      // profile.city is 'nyc', but the Boston venue wins — location is the
      // venue's, not the user's (ADR 007).
      city: 'boston',
      metro: 'boston',
      visibility: 'public',
      createdAt,
    });
    expect(creation.rating).not.toHaveProperty('ratingId');
    expect(creation.rating).not.toHaveProperty('reviewId');
    expect(creation.rating).not.toHaveProperty('description');
    expect(creation.rating).not.toHaveProperty('mediaUrls');
    expect(creation.rating).not.toHaveProperty('photoURLs');
    expect(creation.rating).not.toHaveProperty('likes');

    expect(creation.post).toMatchObject({
      ratingId: 'rating-1',
      userId: 'user-1',
      venueId: 'venue-1',
      city: 'boston',
      metro: 'boston',
      notes: 'Great martinis.',
      mediaPaths: ['ratings/rating-1/photo_1700000000000_0.jpg'],
      visibility: 'public',
      likes: 0,
      likedBy: [],
      bookmarks: 0,
      bookmarkedBy: [],
      createdAt,
    });
    expect(creation.post).not.toHaveProperty('reviewId');
    expect(creation.post).not.toHaveProperty('postId');
    expect(creation.post).not.toHaveProperty('description');
    expect(creation.post).not.toHaveProperty('mediaUrls');
    expect(creation.post).not.toHaveProperty('photoURLs');
  });

  test('does not build a public projection for private or unlisted Ratings', () => {
    const base = {
      user,
      profile,
      venue,
      sentiment: 'fine',
      notes: '',
      mediaPaths: [],
      createdAt: 1,
    };

    expect(shouldCreatePostProjection({ visibility: 'public' })).toBe(true);
    expect(shouldCreatePostProjection({ visibility: 'unlisted' })).toBe(false);
    expect(shouldCreatePostProjection({ visibility: 'private' })).toBe(false);
    expect(buildRatingCreation({ ...base, ratingId: 'unlisted-1', visibility: 'unlisted' }).post).toBeNull();
    expect(buildRatingCreation({ ...base, ratingId: 'private-1', visibility: 'private' }).post).toBeNull();
  });

  test('includes companionUids in Rating and Post payloads when provided', () => {
    const creation = buildRatingCreation({
      ratingId: 'rating-1',
      user,
      profile,
      venue,
      sentiment: 'loved',
      notes: '',
      companionUids: ['friend-1', 'friend-2'],
      createdAt: 1,
    });

    expect(creation.rating.companionUids).toEqual(['friend-1', 'friend-2']);
    expect(creation.post.companionUids).toEqual(['friend-1', 'friend-2']);
  });

  test('omits companionUids when empty or not provided', () => {
    const withEmpty = buildRatingCreation({
      ratingId: 'rating-1',
      user,
      profile,
      venue,
      sentiment: 'loved',
      notes: '',
      companionUids: [],
      createdAt: 1,
    });
    expect(withEmpty.rating).not.toHaveProperty('companionUids');
    expect(withEmpty.post).not.toHaveProperty('companionUids');

    const without = buildRatingCreation({
      ratingId: 'rating-1',
      user,
      profile,
      venue,
      sentiment: 'loved',
      notes: '',
      createdAt: 1,
    });
    expect(without.rating).not.toHaveProperty('companionUids');
    expect(without.post).not.toHaveProperty('companionUids');
  });

  test('rejects invalid canonical Rating inputs', () => {
    expect(() => buildRatingPayload({ user, profile, venue, sentiment: 'meh' })).toThrow('valid sentiment');
    expect(() => buildRatingPayload({ user, profile, venue, sentiment: 'loved', visibility: 'friends' })).toThrow('valid visibility');
    expect(() => buildPostProjection({ ratingId: '', rating: { visibility: 'public' } })).toThrow('ratingId is required');
  });

  test('pure payload builders do not import Firebase', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'ratings', 'rating-payloads.js'), 'utf8');
    expect(source).not.toMatch(/firebase\//);
    expect(source).not.toMatch(/\.\.\/firebase/);
  });
});
