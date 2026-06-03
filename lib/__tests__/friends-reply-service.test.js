const {
  buildReplyPreview,
  buildReplyMessagePayload,
} = require('../friends/reply-service');

describe('Friends reply quote service contracts', () => {
  test('builds reply preview from text message', () => {
    expect(buildReplyPreview({
      id: 'm1',
      senderUid: 'alice',
      type: 'text',
      text: 'Hello world',
    })).toEqual({
      replyToMessageId: 'm1',
      replyToPreview: {
        senderUid: 'alice',
        type: 'text',
        snippet: 'Hello world',
      },
    });
  });

  test('builds reply preview from venue link', () => {
    expect(buildReplyPreview({
      id: 'm2',
      senderUid: 'bob',
      type: 'venue_link',
      venueName: 'Good Bar',
    })).toEqual({
      replyToMessageId: 'm2',
      replyToPreview: {
        senderUid: 'bob',
        type: 'venue_link',
        snippet: 'Good Bar',
      },
    });
  });

  test('builds reply preview from deleted message', () => {
    expect(buildReplyPreview({
      id: 'm3',
      senderUid: 'cara',
      type: 'text',
      text: 'Hello',
      deletedForEveryoneAt: 10,
    })).toEqual({
      replyToMessageId: 'm3',
      replyToPreview: {
        senderUid: 'cara',
        type: 'text',
        snippet: 'Original message deleted.',
      },
    });
  });

  test('builds reply message payload with reply metadata', () => {
    const payload = buildReplyMessagePayload({
      senderUid: 'alice',
      text: 'I agree',
      replyToMessageId: 'm1',
      replyToPreview: {
        senderUid: 'bob',
        type: 'text',
        snippet: 'Hello world',
      },
      createdAt: 10,
    });

    expect(payload).toEqual({
      senderUid: 'alice',
      type: 'text',
      text: 'I agree',
      replyToMessageId: 'm1',
      replyToPreview: {
        senderUid: 'bob',
        type: 'text',
        snippet: 'Hello world',
      },
      createdAt: 10,
      deletedForEveryoneAt: null,
    });
  });
});
