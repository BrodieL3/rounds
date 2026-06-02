const {
  buildDirectVenueLinkMessageWrites,
  buildGroupVenueLinkMessageWrites,
  buildVenueLinkPayload,
  normalizeVenueLinkPayload,
} = require('../friends/venue-link-service');

describe('Friends venue link message service contracts', () => {
  const venue = {
    id: 'venue-1',
    name: 'Moon Bar',
    cohort: 'cocktail_bar',
    address: '123 Night St, New York, NY',
  };

  test('normalizes venue link payloads from static venue data', () => {
    expect(normalizeVenueLinkPayload({ venue, cityKey: 'nyc' })).toEqual({
      venueId: 'venue-1',
      venueName: 'Moon Bar',
      venueCohort: 'cocktail_bar',
      venueCity: 'nyc',
      venueAddress: '123 Night St, New York, NY',
    });

    expect(() => normalizeVenueLinkPayload({ venue: { name: 'No id', cohort: 'pub' }, cityKey: 'nyc' })).toThrow('venueId');
    expect(() => normalizeVenueLinkPayload({ venue: { id: 'v1', cohort: 'pub' }, cityKey: 'nyc' })).toThrow('venueName');
    expect(() => normalizeVenueLinkPayload({ venue: { id: 'v1', name: 'No cohort' }, cityKey: 'nyc' })).toThrow('venueCohort');
  });

  test('builds message and lastMessage payloads for venue links', () => {
    expect(buildVenueLinkPayload({ senderUid: 'alice', venue, cityKey: 'nyc', messageId: 'm1', createdAt: 10 })).toEqual({
      lastMessage: {
        id: 'm1',
        senderUid: 'alice',
        type: 'venue_link',
        venueId: 'venue-1',
        venueName: 'Moon Bar',
        venueCohort: 'cocktail_bar',
        venueCity: 'nyc',
        venueAddress: '123 Night St, New York, NY',
        createdAt: 10,
      },
      message: {
        senderUid: 'alice',
        type: 'venue_link',
        venueId: 'venue-1',
        venueName: 'Moon Bar',
        venueCohort: 'cocktail_bar',
        venueCity: 'nyc',
        venueAddress: '123 Night St, New York, NY',
        createdAt: 10,
        deletedForEveryoneAt: null,
      },
    });
  });

  test('builds first-send DM venue link writes without text fields', () => {
    expect(buildDirectVenueLinkMessageWrites({
      senderUid: 'bob',
      recipientUid: 'alice',
      venue,
      cityKey: 'nyc',
      messageId: 'm1',
      createdAt: 10,
      isFirstMessage: true,
    })).toEqual({
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
          type: 'venue_link',
          venueId: 'venue-1',
          venueName: 'Moon Bar',
          venueCohort: 'cocktail_bar',
          venueCity: 'nyc',
          venueAddress: '123 Night St, New York, NY',
          createdAt: 10,
        },
      },
      members: {
        alice: { uid: 'alice', role: 'member', joinedAt: 10, leftAt: null },
        bob: { uid: 'bob', role: 'member', joinedAt: 10, leftAt: null },
      },
      message: {
        senderUid: 'bob',
        type: 'venue_link',
        venueId: 'venue-1',
        venueName: 'Moon Bar',
        venueCohort: 'cocktail_bar',
        venueCity: 'nyc',
        venueAddress: '123 Night St, New York, NY',
        createdAt: 10,
        deletedForEveryoneAt: null,
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

  test('builds group venue link writes and notification fanout', () => {
    expect(buildGroupVenueLinkMessageWrites({
      conversationId: 'group1',
      memberUids: ['alice', 'bob', 'cara'],
      senderUid: 'alice',
      venue,
      cityKey: 'nyc',
      messageId: 'm2',
      createdAt: 20,
    })).toEqual({
      conversationUpdate: {
        lastMessageAt: 20,
        lastMessage: {
          id: 'm2',
          senderUid: 'alice',
          type: 'venue_link',
          venueId: 'venue-1',
          venueName: 'Moon Bar',
          venueCohort: 'cocktail_bar',
          venueCity: 'nyc',
          venueAddress: '123 Night St, New York, NY',
          createdAt: 20,
        },
      },
      message: {
        senderUid: 'alice',
        type: 'venue_link',
        venueId: 'venue-1',
        venueName: 'Moon Bar',
        venueCohort: 'cocktail_bar',
        venueCity: 'nyc',
        venueAddress: '123 Night St, New York, NY',
        createdAt: 20,
        deletedForEveryoneAt: null,
      },
      senderState: { hiddenAt: null, lastSeenAt: 20 },
      recipientNotifications: {
        bob: { type: 'new_group_message', actorUid: 'alice', conversationId: 'group1', createdAt: 20 },
        cara: { type: 'new_group_message', actorUid: 'alice', conversationId: 'group1', createdAt: 20 },
      },
    });
  });
});
