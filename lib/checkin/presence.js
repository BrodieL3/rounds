// Pure. Presence lifecycle for venue check-in: TTL-based expiry (no background
// geofence) + visibility resolution that honors ghost mode and the block list.
// Timestamps are fixed-format UTC ISO strings (lexical == chronological).
// Firebase-free.

const HOUR_MS = 3600 * 1000;

function buildPresence({ uid, venueId, now = new Date(), ttlHours = 4, ghost = false } = {}) {
  if (!uid) throw new Error('uid is required');
  if (!venueId) throw new Error('venueId is required');
  const checkedInAt = new Date(now);
  const expiresAt = new Date(checkedInAt.getTime() + ttlHours * HOUR_MS);
  return {
    uid,
    venueId,
    checkedInAt: checkedInAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    ghost: Boolean(ghost),
  };
}

function isExpired(presence, now = new Date()) {
  return new Date(now).toISOString() > presence.expiresAt;
}

// Who the viewer should see in "who's here": other users who are not ghosted,
// not blocked (caller passes the union of both-way blocks), and not expired.
function visiblePresence(presences = [], viewerUid, { blockedUids = [], now = new Date() } = {}) {
  const blocked = new Set(blockedUids);
  return presences.filter((p) =>
    p.uid !== viewerUid
    && !p.ghost
    && !blocked.has(p.uid)
    && !isExpired(p, now));
}

module.exports = { buildPresence, isExpired, visiblePresence };
