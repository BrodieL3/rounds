// Server-only (the resolveConnectionToken Function mints + resolves these).
// Single-use, short-TTL connection tokens for in-person QR connect. crypto gives
// an unguessable token; consumption makes it single-use, defeating screenshot
// replay without 30s rotation. Firebase-free.

const crypto = require('crypto');
const MIN_MS = 60 * 1000;

function mintToken({ uid, now = new Date(), ttlMinutes = 3 } = {}) {
  if (!uid) throw new Error('uid is required');
  const createdAt = new Date(now);
  return {
    token: crypto.randomBytes(24).toString('hex'),
    uid,
    createdAt: createdAt.toISOString(),
    expiresAt: new Date(createdAt.getTime() + ttlMinutes * MIN_MS).toISOString(),
    consumed: false,
  };
}

function isResolvable(tokenDoc, now = new Date()) {
  if (!tokenDoc || tokenDoc.consumed) return false;
  return new Date(now).toISOString() <= tokenDoc.expiresAt;
}

function markConsumed(tokenDoc) {
  return { ...tokenDoc, consumed: true };
}

module.exports = { mintToken, isResolvable, markConsumed };
