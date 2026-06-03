const {
  buildConversationTitle,
  buildEmptyState,
  canDeleteForEveryone,
  canReport,
  formatVoiceDuration,
} = require('../friends/conversation-surface');

describe('Conversation surface view model', () => {
  test('builds group title from conversation name', () => {
    expect(buildConversationTitle({ conversation: { type: 'group', name: 'Friday Crew' } })).toBe('Friday Crew');
    expect(buildConversationTitle({ conversation: { type: 'group' } })).toBe('Group chat');
  });

  test('builds DM title from other user', () => {
    expect(buildConversationTitle({ conversation: { type: 'dm' }, otherUser: { displayName: 'Alice' } })).toBe('Alice');
    expect(buildConversationTitle({ conversation: { type: 'dm' }, otherUser: { username: 'alice123' } })).toBe('alice123');
    expect(buildConversationTitle({ conversation: { type: 'dm' } })).toBe('Direct message');
  });

  test('builds empty state for group', () => {
    const state = buildEmptyState({ isGroup: true, title: 'Friday Crew' });
    expect(state.title).toBe('Start planning in Friday Crew.');
    expect(state.body).toBe('Send the first message to this group.');
  });

  test('builds empty state for DM', () => {
    const state = buildEmptyState({ isGroup: false, title: 'Alice' });
    expect(state.title).toBe('Start planning with Alice.');
    expect(state.body).toBe('Send the first message to create this DM.');
  });

  test('allows delete for own non-deleted messages only', () => {
    expect(canDeleteForEveryone({ isMine: true, deletedForEveryoneAt: null })).toBe(true);
    expect(canDeleteForEveryone({ isMine: true, deletedForEveryoneAt: 100 })).toBe(false);
    expect(canDeleteForEveryone({ isMine: false, deletedForEveryoneAt: null })).toBe(false);
  });

  test('allows report for others non-deleted messages only', () => {
    expect(canReport({ isMine: false, deletedForEveryoneAt: null })).toBe(true);
    expect(canReport({ isMine: false, deletedForEveryoneAt: 100 })).toBe(false);
    expect(canReport({ isMine: true, deletedForEveryoneAt: null })).toBe(false);
  });

  test('formats voice duration', () => {
    expect(formatVoiceDuration(0)).toBe('0:00');
    expect(formatVoiceDuration(45000)).toBe('0:45');
    expect(formatVoiceDuration(125000)).toBe('2:05');
    expect(formatVoiceDuration(60000)).toBe('1:00');
  });
});
