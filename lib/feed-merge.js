// Pure. Merges the Discover feed's two kinds of post into one imminence-tier list:
// tonight's event-posts first (soonest-first), then Review posts (most-recent-first).
// Recency and imminence are different axes and are never collapsed into one key.
// Events not happening tonight are dropped (free expiry). Firebase-free.

const { isWithinTonight } = require('./events/tonight-window');

function toMillis(v) {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return new Date(v).getTime();
  if (v instanceof Date) return v.getTime();
  if (typeof v.toMillis === 'function') return v.toMillis(); // Firestore Timestamp
  if (typeof v.seconds === 'number') return v.seconds * 1000;
  return 0;
}

function mergeFeed({ posts = [], events = [], now = new Date(), windowOpts = {} } = {}) {
  const tonight = events
    .filter((e) => isWithinTonight(e.startTime, now, windowOpts))
    .sort((a, b) => (a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0))
    .map((e) => ({ ...e, type: 'event' }));

  const recentPosts = [...posts]
    .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
    .map((p) => ({ ...p, type: p.type || 'rating' }));

  return [...tonight, ...recentPosts];
}

module.exports = { mergeFeed, toMillis };
