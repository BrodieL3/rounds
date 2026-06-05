const { formatElapsedTime } = require('./feed-display');
const { getVenueNeighborhood } = require('./venue-display');

function createSeedVenueLookup(venueSeed) {
  return Object.entries(venueSeed?.cities || {}).reduce((cities, [cityKey, city]) => {
    cities[cityKey] = new Map((city.venues || []).map((venue) => [venue.id, venue]));
    return cities;
  }, {});
}

function getSeedVenue(item, cityKey, venueLookup = {}) {
  return venueLookup[cityKey]?.get(item.venueId) || null;
}

function getComparableTime(item) {
  return item.createdAt?.toDate?.() || item.createdAt || 0;
}

function compareFeedItems(a, b) {
  if (a.source !== b.source) return a.source === 'friend' ? -1 : 1;
  return new Date(getComparableTime(b)) - new Date(getComparableTime(a));
}

function buildFeedViewItems({ posts = [], city, following = [], venueLookup = {}, now = new Date() } = {}) {
  const followingSet = following instanceof Set ? following : new Set(following || []);

  return posts.map((post) => {
    // Firestore query owns city scoping. Pure VM preserves/enriches already-scoped post projections.
    const postCity = post.city || city;
    const seedVenue = getSeedVenue(post, postCity, venueLookup);

    return {
      ...post,
      venueName: post.venueName || seedVenue?.name,
      neighborhood: post.neighborhood || (seedVenue ? getVenueNeighborhood(seedVenue, postCity) : null),
      source: followingSet.has(post.userId) ? 'friend' : 'city',
      timeAgo: formatElapsedTime(post.createdAt?.toDate?.() || post.createdAt, now),
    };
  }).sort(compareFeedItems);
}

module.exports = {
  buildFeedViewItems,
  compareFeedItems,
  createSeedVenueLookup,
  getSeedVenue,
};
