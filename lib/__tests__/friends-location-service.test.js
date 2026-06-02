const {
  buildLocationMessagePayload,
  buildDirectLocationMessageWrites,
  buildGroupLocationMessageWrites,
  normalizeLocationLabel,
} = require('../friends/location-service');

describe('Friends location message service contracts', () => {
  test('builds location message payload with lat, lng, and label', () => {
    expect(buildLocationMessagePayload({
      senderUid: 'alice',
      lat: 40.7128,
      lng: -74.0060,
      label: 'Good Bar, NYC',
      createdAt: 10,
    })).toEqual({
      senderUid: 'alice',
      type: 'location',
      lat: 40.7128,
      lng: -74.0060,
      label: 'Good Bar, NYC',
      createdAt: 10,
      deletedForEveryoneAt: null,
    });
  });

  test('rejects invalid location payloads', () => {
    expect(() => buildLocationMessagePayload({})).toThrow('senderUid');
    expect(() => buildLocationMessagePayload({ senderUid: 'a', lat: 'bad' })).toThrow('lat');
    expect(() => buildLocationMessagePayload({ senderUid: 'a', lat: 0, lng: 'bad' })).toThrow('lng');
    expect(() => buildLocationMessagePayload({
      senderUid: 'a', lat: 0, lng: 0, label: 'x'.repeat(241),
    })).toThrow('label');
  });

  test('normalizes location label', () => {
    expect(normalizeLocationLabel('  Good Bar  ')).toBe('Good Bar');
    expect(normalizeLocationLabel('')).toBe('');
  });

  test('builds first DM location message writes', () => {
    const writes = buildDirectLocationMessageWrites({
      senderUid: 'alice',
      recipientUid: 'bob',
      lat: 40.7128,
      lng: -74.0060,
      label: 'Good Bar',
      messageId: 'm1',
      createdAt: 10,
      isFirstMessage: true,
    });

    expect(writes.conversationId).toBe('dm_alice_bob');
    expect(writes.conversation.type).toBe('dm');
    expect(writes.message.type).toBe('location');
    expect(writes.message.lat).toBe(40.7128);
    expect(writes.message.lng).toBe(-74.0060);
    expect(writes.message.label).toBe('Good Bar');
    expect(writes.members).toBeTruthy();
    expect(writes.recipientNotification.type).toBe('new_direct_message');
  });

  test('builds group location message writes with notification fanout', () => {
    const writes = buildGroupLocationMessageWrites({
      conversationId: 'group1',
      memberUids: ['alice', 'bob', 'cara'],
      senderUid: 'alice',
      lat: 40.7128,
      lng: -74.0060,
      label: 'Good Bar',
      messageId: 'm1',
      createdAt: 10,
    });

    expect(writes.conversationUpdate.lastMessage.type).toBe('location');
    expect(writes.message.lat).toBe(40.7128);
    expect(Object.keys(writes.recipientNotifications)).toEqual(['bob', 'cara']);
  });
});
