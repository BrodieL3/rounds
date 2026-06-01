const {
  buildBlockId,
  buildDirectConversationId,
  buildFriendRequestId,
  buildFriendshipId,
  getSortedPairUids,
} = require('../friends/ids');

describe('Friends ID builders', () => {
  test('builds deterministic pair-based IDs independent of uid order', () => {
    expect(getSortedPairUids('bob', 'alice')).toEqual(['alice', 'bob']);
    expect(buildFriendshipId('bob', 'alice')).toBe('alice_bob');
    expect(buildFriendshipId('alice', 'bob')).toBe('alice_bob');
    expect(buildDirectConversationId('bob', 'alice')).toBe('dm_alice_bob');
    expect(buildDirectConversationId('alice', 'bob')).toBe('dm_alice_bob');
  });

  test('builds directional request and block IDs', () => {
    expect(buildFriendRequestId('alice', 'bob')).toBe('alice_bob');
    expect(buildFriendRequestId('bob', 'alice')).toBe('bob_alice');
    expect(buildBlockId('alice', 'bob')).toBe('alice_bob');
    expect(buildBlockId('bob', 'alice')).toBe('bob_alice');
  });

  test('rejects same-user and missing pair IDs', () => {
    expect(() => buildFriendshipId('alice', 'alice')).toThrow('different users');
    expect(() => buildDirectConversationId('alice', '')).toThrow('non-empty');
    expect(() => buildFriendRequestId('alice', 'alice')).toThrow('different users');
  });
});
