function buildConversationTitle({ conversation, otherUser }) {
  const isGroup = conversation?.type === 'group';
  return isGroup
    ? (conversation?.name || 'Group chat')
    : (otherUser?.displayName || otherUser?.username || 'Direct message');
}

function buildEmptyState({ isGroup, title }) {
  return {
    title: isGroup ? `Start planning in ${title}.` : `Start planning with ${title}.`,
    body: isGroup ? 'Send the first message to this group.' : 'Send the first message to create this DM.',
  };
}

function canDeleteForEveryone({ isMine, deletedForEveryoneAt }) {
  return isMine && !deletedForEveryoneAt;
}

function canReport({ isMine, deletedForEveryoneAt }) {
  return !isMine && !deletedForEveryoneAt;
}

function formatVoiceDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

module.exports = {
  buildConversationTitle,
  buildEmptyState,
  canDeleteForEveryone,
  canReport,
  formatVoiceDuration,
};
