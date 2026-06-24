const {
  FRIENDS_EMPTY_INBOX,
  buildFriendsInboxViewModel,
  formatInboxMessagePreview,
  formatInboxTimestamp,
  isConversationUnread,
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

  test('formats iMessage-style inbox timestamps', () => {
    const now = new Date('2026-06-23T18:00:00').getTime();
    expect(formatInboxTimestamp(null, now)).toBe('');
    expect(formatInboxTimestamp(new Date('2026-06-23T09:41:00').getTime(), now)).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/i);
    expect(formatInboxTimestamp(new Date('2026-06-22T09:41:00').getTime(), now)).toBe('Yesterday');
    expect(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])
      .toContain(formatInboxTimestamp(new Date('2026-06-20T12:00:00').getTime(), now));
    expect(formatInboxTimestamp(new Date('2026-06-10T12:00:00').getTime(), now)).toMatch(/\d{1,2}\/\d{1,2}\/\d{2,4}/);
  });

  test('marks a thread unread only when the other person sent the latest unseen message', () => {
    expect(isConversationUnread({ lastMessageAt: 200, lastMessage: { senderUid: 'other' } }, { lastSeenAt: 100 }, 'me')).toBe(true);
    expect(isConversationUnread({ lastMessageAt: 200, lastMessage: { senderUid: 'me' } }, { lastSeenAt: 100 }, 'me')).toBe(false);
    expect(isConversationUnread({ lastMessageAt: 50, lastMessage: { senderUid: 'other' } }, { lastSeenAt: 100 }, 'me')).toBe(false);
    expect(isConversationUnread({ lastMessage: { senderUid: 'other' } }, {}, 'me')).toBe(false);
  });

  test('decorates rows with timestamp + unread and exposes them via the view model', () => {
    const viewModel = buildFriendsInboxViewModel(
      [{ id: 'a', type: 'dm', lastMessageAt: 100, lastMessage: { senderUid: 'other' }, state: { lastSeenAt: 50 } }],
      {},
      'me',
      new Date('2026-06-23T12:00:00').getTime(),
    );
    expect(typeof viewModel.conversations[0].timestamp).toBe('string');
    expect(viewModel.conversations[0].unread).toBe(true);
  });

  test('splits pinned conversations to the top and out of the main list', () => {
    const viewModel = buildFriendsInboxViewModel([
      { id: 'pinned-1', type: 'dm', lastMessageAt: 5, state: { pinnedAt: 999 } },
      { id: 'active', type: 'dm', lastMessageAt: 20 },
    ]);
    expect(viewModel.pinned.map((conversation) => conversation.id)).toEqual(['pinned-1']);
    expect(viewModel.conversations.map((conversation) => conversation.id)).toEqual(['active']);
  });

  test('treats a Date pinnedAt as pinned (optimistic in-app pin shape)', () => {
    const viewModel = buildFriendsInboxViewModel([
      { id: 'opt', type: 'dm', lastMessageAt: 5, state: { pinnedAt: new Date() } },
    ]);
    expect(viewModel.pinned.map((conversation) => conversation.id)).toEqual(['opt']);
    expect(viewModel.conversations).toEqual([]);
  });

  test('returns empty pinned list and full conversation list when nothing is pinned', () => {
    expect(buildFriendsInboxViewModel([]).pinned).toEqual([]);
    const viewModel = buildFriendsInboxViewModel([
      { id: 'a', type: 'dm', lastMessageAt: 20 },
      { id: 'b', type: 'dm', lastMessageAt: 10 },
    ]);
    expect(viewModel.pinned).toEqual([]);
    expect(viewModel.conversations.map((conversation) => conversation.id)).toEqual(['a', 'b']);
    expect(viewModel.isEmpty).toBe(false);
  });

  test('surfaces hidden conversations in a separate list, out of the visible inbox', () => {
    const viewModel = buildFriendsInboxViewModel([
      { id: 'visible', type: 'dm', lastMessageAt: 200 },
      { id: 'hidden', type: 'dm', lastMessageAt: 100, state: { hiddenAt: 150 } },
    ]);
    expect(viewModel.conversations.map((conversation) => conversation.id)).toEqual(['visible']);
    expect(viewModel.hidden.map((conversation) => conversation.id)).toEqual(['hidden']);
  });

  test('a hidden conversation with a newer message returns to the visible inbox', () => {
    const viewModel = buildFriendsInboxViewModel([
      { id: 'reactivated', type: 'dm', lastMessageAt: 300, state: { hiddenAt: 150 } },
    ]);
    expect(viewModel.conversations.map((conversation) => conversation.id)).toEqual(['reactivated']);
    expect(viewModel.hidden).toEqual([]);
  });

  test('exposes an empty hidden list when nothing is hidden', () => {
    expect(buildFriendsInboxViewModel([{ id: 'a', type: 'dm', lastMessageAt: 20 }]).hidden).toEqual([]);
  });
});
