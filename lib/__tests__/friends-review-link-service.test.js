const {
  buildDirectReviewLinkMessageWrites,
  buildGroupReviewLinkMessageWrites,
  buildReviewLinkPayload,
  normalizeReviewLinkPayload,
} = require('../friends/review-link-service');

describe('Friends review link message service contracts', () => {
  const review = {
    ratingId: 'rating-1',
    venueId: 'venue-1',
    venueName: 'Moon Bar',
    venueCohort: 'cocktail_bar',
    sentiment: 'loved',
    authorDisplayName: 'Alice',
    authorUsername: 'alice',
    notes: 'Great martinis',
  };

  test('normalizes review link payloads from rating data', () => {
    expect(normalizeReviewLinkPayload({ review })).toEqual({
      ratingId: 'rating-1',
      venueId: 'venue-1',
      venueName: 'Moon Bar',
      venueCohort: 'cocktail_bar',
      sentiment: 'loved',
      authorDisplayName: 'Alice',
      authorUsername: 'alice',
      notes: 'Great martinis',
    });

    expect(() => normalizeReviewLinkPayload({ review: { venueId: 'v1' } })).toThrow('ratingId');
    expect(() => normalizeReviewLinkPayload({ review: { ratingId: 'r1' } })).toThrow('venueId');
    expect(() => normalizeReviewLinkPayload({ review: { ratingId: 'r1', venueId: 'v1' } })).toThrow('venueName');
    expect(() => normalizeReviewLinkPayload({ review: { ratingId: 'r1', venueId: 'v1', venueName: 'Bar' } })).toThrow('venueCohort');
    expect(() => normalizeReviewLinkPayload({ review: { ratingId: 'r1', venueId: 'v1', venueName: 'Bar', venueCohort: 'pub' } })).toThrow('sentiment');
  });

  test('builds message and lastMessage payloads for review links', () => {
    expect(buildReviewLinkPayload({ senderUid: 'alice', review, messageId: 'm1', createdAt: 10 })).toEqual({
      lastMessage: {
        id: 'm1',
        senderUid: 'alice',
        type: 'review_link',
        ratingId: 'rating-1',
        venueId: 'venue-1',
        venueName: 'Moon Bar',
        venueCohort: 'cocktail_bar',
        sentiment: 'loved',
        authorDisplayName: 'Alice',
        authorUsername: 'alice',
        notes: 'Great martinis',
        createdAt: 10,
      },
      message: {
        senderUid: 'alice',
        type: 'review_link',
        ratingId: 'rating-1',
        venueId: 'venue-1',
        venueName: 'Moon Bar',
        venueCohort: 'cocktail_bar',
        sentiment: 'loved',
        authorDisplayName: 'Alice',
        authorUsername: 'alice',
        notes: 'Great martinis',
        createdAt: 10,
        deletedForEveryoneAt: null,
      },
    });
  });

  test('builds first-send DM review link writes', () => {
    expect(buildDirectReviewLinkMessageWrites({
      senderUid: 'bob',
      recipientUid: 'alice',
      review,
      messageId: 'm1',
      createdAt: 10,
      isFirstMessage: true,
    })).toMatchObject({
      conversationId: 'dm_alice_bob',
      conversation: {
        type: 'dm',
        memberUids: ['alice', 'bob'],
        createdAt: 10,
        createdByUid: 'bob',
        lastMessageAt: 10,
        lastMessage: {
          id: 'm1',
          senderUid: 'bob',
          type: 'review_link',
          ratingId: 'rating-1',
        },
      },
      members: {
        alice: { uid: 'alice', role: 'member', joinedAt: 10, leftAt: null },
        bob: { uid: 'bob', role: 'member', joinedAt: 10, leftAt: null },
      },
      message: {
        senderUid: 'bob',
        type: 'review_link',
        ratingId: 'rating-1',
      },
      senderState: { hiddenAt: null, lastSeenAt: 10 },
      recipientState: { hiddenAt: null },
      recipientNotification: {
        type: 'new_direct_message',
        actorUid: 'bob',
        conversationId: 'dm_alice_bob',
        createdAt: 10,
      },
    });
  });

  test('builds group review link writes and notification fanout', () => {
    expect(buildGroupReviewLinkMessageWrites({
      conversationId: 'group1',
      memberUids: ['alice', 'bob', 'cara'],
      senderUid: 'alice',
      review,
      messageId: 'm2',
      createdAt: 20,
    })).toMatchObject({
      conversationUpdate: {
        lastMessageAt: 20,
        lastMessage: {
          id: 'm2',
          senderUid: 'alice',
          type: 'review_link',
          ratingId: 'rating-1',
        },
      },
      message: {
        senderUid: 'alice',
        type: 'review_link',
        ratingId: 'rating-1',
      },
      senderState: { hiddenAt: null, lastSeenAt: 20 },
      recipientNotifications: {
        bob: { type: 'new_group_message', actorUid: 'alice', conversationId: 'group1', createdAt: 20 },
        cara: { type: 'new_group_message', actorUid: 'alice', conversationId: 'group1', createdAt: 20 },
      },
    });
  });
});
