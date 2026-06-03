const {
  ALLOWED_REACTIONS,
  buildReactionPayload,
  canToggleReaction,
  toggleReaction,
} = require('../friends/reactions-service');

describe('Friends reactions service contracts', () => {
  test('allowed reactions are the six MVP emojis', () => {
    expect(ALLOWED_REACTIONS).toEqual(['👍', '❤️', '😂', '😮', '😢', '🔥']);
  });

  test('builds reaction payload', () => {
    expect(buildReactionPayload({ uid: 'alice', emoji: '👍', createdAt: 10 })).toEqual({
      uid: 'alice',
      emoji: '👍',
      createdAt: 10,
    });
  });

  test('rejects invalid reaction emoji', () => {
    expect(() => buildReactionPayload({ uid: 'alice', emoji: '🚀', createdAt: 10 })).toThrow();
    expect(() => buildReactionPayload({ uid: 'alice', emoji: '', createdAt: 10 })).toThrow();
  });

  test('allows toggling own reaction', () => {
    expect(canToggleReaction({ uid: 'alice', emoji: '👍' }, 'alice')).toBe(true);
  });

  test('prevents toggling another users reaction', () => {
    expect(canToggleReaction({ uid: 'bob', emoji: '👍' }, 'alice')).toBe(false);
  });

  test('computes toggle result for add and remove', () => {
    const existing = [
      { uid: 'alice', emoji: '👍' },
      { uid: 'bob', emoji: '❤️' },
    ];

    // Add new reaction
    expect(toggleReaction(existing, { uid: 'alice', emoji: '🔥' })).toEqual([
      { uid: 'alice', emoji: '🔥' },
      { uid: 'bob', emoji: '❤️' },
    ]);

    // Remove own reaction (same emoji)
    expect(toggleReaction(existing, { uid: 'alice', emoji: '👍' })).toEqual([
      { uid: 'bob', emoji: '❤️' },
    ]);

    // Change reaction (different emoji)
    expect(toggleReaction(existing, { uid: 'alice', emoji: '❤️' })).toEqual([
      { uid: 'alice', emoji: '❤️' },
      { uid: 'bob', emoji: '❤️' },
    ]);
  });
});
