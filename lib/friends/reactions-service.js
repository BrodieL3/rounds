const ALLOWED_REACTIONS = Object.freeze(['👍', '❤️', '😂', '😮', '😢', '🔥']);

function requiredString(value, fieldName) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) throw new Error(`${fieldName} is required`);
  return normalized;
}

function buildReactionPayload({ uid, emoji, createdAt }) {
  const userId = requiredString(uid, 'uid');
  const reactionEmoji = requiredString(emoji, 'emoji');
  if (!ALLOWED_REACTIONS.includes(reactionEmoji)) {
    throw new Error(`Reaction must be one of: ${ALLOWED_REACTIONS.join(' ')}`);
  }
  return { uid: userId, emoji: reactionEmoji, createdAt };
}

function canToggleReaction(reaction = {}, viewerUid) {
  return reaction.uid === viewerUid;
}

function toggleReaction(existingReactions = [], newReaction) {
  const filtered = existingReactions.filter((r) => r.uid !== newReaction.uid);
  const existing = existingReactions.find((r) => r.uid === newReaction.uid);
  if (!existing || existing.emoji !== newReaction.emoji) {
    filtered.push(newReaction);
  }
  return filtered.sort((a, b) => a.uid.localeCompare(b.uid));
}

module.exports = {
  ALLOWED_REACTIONS,
  buildReactionPayload,
  canToggleReaction,
  toggleReaction,
};
module.exports.__esModule = true;
