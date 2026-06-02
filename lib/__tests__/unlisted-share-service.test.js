const {
  validateShareRequest,
  buildShareGrants,
} = require('../unlisted-share-service');

describe('unlisted share service helpers', () => {
  test('validates share request with required fields', () => {
    expect(() => validateShareRequest({})).toThrow('ratingId');
    expect(() => validateShareRequest({ ratingId: 'r1' })).toThrow('conversationId');
    expect(() => validateShareRequest({ ratingId: 'r1', conversationId: 'c1' })).not.toThrow();
  });

  test('builds share grants for active members', () => {
    const result = buildShareGrants({
      ratingId: 'rating-1',
      conversationId: 'conv-1',
      sharedByUid: 'alice',
      activeMemberUids: ['alice', 'bob', 'cara'],
      createdAt: 'TS',
    });

    expect(result.ratingShare).toEqual({
      conversationId: 'conv-1',
      sharedByUid: 'alice',
      createdAt: 'TS',
      revokedAt: null,
    });

    expect(result.memberShares).toEqual({
      alice: { ratingId: 'rating-1', conversationId: 'conv-1', grantedAt: 'TS', revokedAt: null },
      bob: { ratingId: 'rating-1', conversationId: 'conv-1', grantedAt: 'TS', revokedAt: null },
      cara: { ratingId: 'rating-1', conversationId: 'conv-1', grantedAt: 'TS', revokedAt: null },
    });
  });
});
