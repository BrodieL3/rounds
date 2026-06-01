const {
  FRIENDS_EMPTY_INBOX,
  buildFriendsInboxViewModel,
  formatInboxMessagePreview,
  isConversationVisible,
} = require('../friends/inbox-display');

describe('Friends inbox display', () => {
  test('builds inbox-first empty state for users without conversations', () => {
    const viewModel = buildFriendsInboxViewModel([]);

    expect(viewModel.conversations).toEqual([]);
    expect(viewModel.isEmpty).toBe(true);
    expect(viewModel.emptyState).toEqual({
      title: 'No conversations yet',
      body: 'Add friends, then start a DM or group chat to plan your next night out.',
    });
    expect(viewModel.actions).toEqual({
      createChatLabel: FRIENDS_EMPTY_INBOX.createChatLabel,
      friendRequestsLabel: FRIENDS_EMPTY_INBOX.friendRequestsLabel,
    });
  });

  test('keeps hidden conversations hidden until a newer message arrives', () => {
    expect(isConversationVisible({ lastMessageAt: 100 }, { hiddenAt: 100 })).toBe(false);
    expect(isConversationVisible({ lastMessageAt: 200 }, { hiddenAt: 100 })).toBe(true);
  });

  test('formats inbox preview labels for deleted messages and attachment types', () => {
    expect(formatInboxMessagePreview({ type: 'text', text: 'Meet at 9?' })).toBe('Meet at 9?');
    expect(formatInboxMessagePreview({ type: 'photo' })).toBe('Photo');
    expect(formatInboxMessagePreview({ type: 'voice' })).toBe('Voice note');
    expect(formatInboxMessagePreview({ type: 'location' })).toBe('Location');
    expect(formatInboxMessagePreview({ type: 'poll', question: 'Where first?' })).toBe('Poll: Where first?');
    expect(formatInboxMessagePreview({ type: 'review_link', venueName: 'Little Ways' })).toBe('Review: Little Ways');
    expect(formatInboxMessagePreview({ type: 'venue_link', venueName: 'Moon Bar' })).toBe('Venue: Moon Bar');
    expect(formatInboxMessagePreview({ type: 'text', deletedForEveryoneAt: 100 })).toBe('Message deleted.');
  });

  test('prefixes preview sender for group conversations only', () => {
    expect(
      formatInboxMessagePreview(
        { type: 'text', text: 'omw' },
        { conversationType: 'group', senderName: 'Alice' },
      ),
    ).toBe('Alice: omw');
    expect(
      formatInboxMessagePreview(
        { type: 'text', text: 'omw' },
        { conversationType: 'dm', senderName: 'Alice' },
      ),
    ).toBe('omw');
  });

  test('formats empty group previews and sorts inactive groups after active conversations', () => {
    expect(formatInboxMessagePreview(null, { conversationType: 'group' })).toBe('No messages yet');

    const viewModel = buildFriendsInboxViewModel([
      { id: 'empty-old', type: 'group', createdAt: 10, lastMessageAt: null },
      { id: 'active', type: 'dm', createdAt: 1, lastMessageAt: 20 },
      { id: 'empty-new', type: 'group', createdAt: 30, lastMessageAt: null },
    ]);

    expect(viewModel.conversations.map((conversation) => conversation.id)).toEqual([
      'active',
      'empty-new',
      'empty-old',
    ]);
  });
});
