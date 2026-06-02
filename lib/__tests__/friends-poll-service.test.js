const {
  buildPollMessagePayload,
  buildPollLastMessage,
  buildDirectPollMessageWrites,
  buildGroupPollMessageWrites,
  normalizePollOptions,
  canVoteInPoll,
  buildPollVotePayload,
  buildPollResults,
  isPollClosed,
  sendDirectPollMessage,
  sendGroupPollMessage,
  castPollVote,
  buildPollOptionAppend,
  MAX_POLL_OPTIONS,
  MAX_POLL_QUESTION_LENGTH,
} = require('../friends/poll-service');

describe('Friends poll message service contracts', () => {
  test('builds poll message payload with validated options', () => {
    const payload = buildPollMessagePayload({
      senderUid: 'alice',
      question: 'Where should we go?',
      options: [
        { id: 'opt1', text: 'Bar A', addedByUid: 'alice' },
        { id: 'opt2', text: 'Bar B' },
      ],
      allowMultiple: false,
      allowMemberOptions: false,
      createdAt: 10,
    });

    expect(payload).toEqual({
      senderUid: 'alice',
      type: 'poll',
      question: 'Where should we go?',
      options: [
        { id: 'opt1', text: 'Bar A', addedByUid: 'alice' },
        { id: 'opt2', text: 'Bar B', addedByUid: null },
      ],
      allowMultiple: false,
      allowMemberOptions: false,
      closesAt: null,
      closedAt: null,
      createdAt: 10,
      deletedForEveryoneAt: null,
    });
  });

  test('normalizes poll options with generated ids when missing', () => {
    const options = normalizePollOptions([
      { text: 'Bar A' },
      { text: 'Bar B', addedByUid: 'alice' },
    ]);

    expect(options.length).toBe(2);
    expect(options[0].id).toBeTruthy();
    expect(options[0].text).toBe('Bar A');
    expect(options[1].text).toBe('Bar B');
    expect(options[1].addedByUid).toBe('alice');
  });

  test('rejects invalid poll payloads', () => {
    expect(() => buildPollMessagePayload({})).toThrow('senderUid');
    expect(() => buildPollMessagePayload({ senderUid: 'a', question: '' })).toThrow('question');
    expect(() => buildPollMessagePayload({
      senderUid: 'a',
      question: 'x'.repeat(MAX_POLL_QUESTION_LENGTH + 1),
    })).toThrow('question');
    expect(() => buildPollMessagePayload({
      senderUid: 'a',
      question: 'Q?',
      options: [{ text: 'A' }],
    })).toThrow('options');
    expect(() => buildPollMessagePayload({
      senderUid: 'a',
      question: 'Q?',
      options: Array.from({ length: MAX_POLL_OPTIONS + 1 }, (_, i) => ({ text: `Opt ${i}` })),
    })).toThrow('options');
  });

  test('builds poll last message with question', () => {
    expect(buildPollLastMessage({
      messageId: 'm1',
      senderUid: 'alice',
      question: 'Where?',
      createdAt: 10,
    })).toEqual({
      id: 'm1',
      senderUid: 'alice',
      type: 'poll',
      question: 'Where?',
      createdAt: 10,
    });
  });

  test('builds first DM poll message writes', () => {
    const writes = buildDirectPollMessageWrites({
      senderUid: 'alice',
      recipientUid: 'bob',
      question: 'Where?',
      options: [{ text: 'Bar A' }, { text: 'Bar B' }],
      allowMultiple: false,
      allowMemberOptions: false,
      messageId: 'm1',
      createdAt: 10,
      isFirstMessage: true,
    });

    expect(writes.conversationId).toBe('dm_alice_bob');
    expect(writes.conversation.type).toBe('dm');
    expect(writes.message.type).toBe('poll');
    expect(writes.message.question).toBe('Where?');
    expect(writes.message.options.length).toBe(2);
    expect(writes.members).toBeTruthy();
    expect(writes.recipientNotification.type).toBe('new_direct_message');
  });

  test('builds group poll message writes with notification fanout', () => {
    const writes = buildGroupPollMessageWrites({
      conversationId: 'group1',
      memberUids: ['alice', 'bob', 'cara'],
      senderUid: 'alice',
      question: 'When?',
      options: [{ text: '9pm' }, { text: '10pm' }],
      allowMultiple: false,
      allowMemberOptions: false,
      messageId: 'm1',
      createdAt: 10,
    });

    expect(writes.conversationUpdate.lastMessage.type).toBe('poll');
    expect(writes.conversationUpdate.lastMessage.question).toBe('When?');
    expect(writes.message.options.length).toBe(2);
    expect(Object.keys(writes.recipientNotifications)).toEqual(['bob', 'cara']);
  });
});

describe('Poll vote logic', () => {
  test('determines if poll is closed', () => {
    expect(isPollClosed({ closedAt: null, closesAt: null })).toBe(false);
    expect(isPollClosed({ closedAt: null, closesAt: Date.now() + 10000 })).toBe(false);
    expect(isPollClosed({ closedAt: new Date(), closesAt: null })).toBe(true);
    expect(isPollClosed({ closedAt: null, closesAt: Date.now() - 1000 })).toBe(true);
  });

  test('allows voting when poll is open', () => {
    const poll = {
      type: 'poll',
      options: [{ id: 'a' }, { id: 'b' }],
      allowMultiple: false,
      closedAt: null,
      closesAt: null,
    };

    expect(canVoteInPoll(poll, ['a'])).toBe(true);
    expect(canVoteInPoll(poll, ['b'])).toBe(true);
  });

  test('rejects voting when poll is closed', () => {
    const poll = {
      type: 'poll',
      options: [{ id: 'a' }],
      closedAt: new Date(),
      closesAt: null,
    };

    expect(canVoteInPoll(poll, ['a'])).toBe(false);
  });

  test('rejects invalid option ids', () => {
    const poll = {
      type: 'poll',
      options: [{ id: 'a' }, { id: 'b' }],
      allowMultiple: false,
      closedAt: null,
      closesAt: null,
    };

    expect(canVoteInPoll(poll, ['c'])).toBe(false);
    expect(canVoteInPoll(poll, [])).toBe(false);
  });

  test('enforces single vs multiple choice', () => {
    const single = {
      type: 'poll',
      options: [{ id: 'a' }, { id: 'b' }],
      allowMultiple: false,
      closedAt: null,
      closesAt: null,
    };
    const multi = { ...single, allowMultiple: true };

    expect(canVoteInPoll(single, ['a', 'b'])).toBe(false);
    expect(canVoteInPoll(multi, ['a', 'b'])).toBe(true);
  });

  test('builds vote payload', () => {
    const payload = buildPollVotePayload({
      uid: 'alice',
      optionIds: ['a', 'b'],
      createdAt: 10,
    });

    expect(payload).toEqual({
      uid: 'alice',
      optionIds: ['a', 'b'],
      createdAt: 10,
      updatedAt: 10,
    });
  });

  test('builds poll results from votes', () => {
    const votes = [
      { uid: 'alice', optionIds: ['a'] },
      { uid: 'bob', optionIds: ['a', 'b'] },
      { uid: 'cara', optionIds: ['b'] },
    ];
    const options = [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }, { id: 'c', text: 'C' }];

    const results = buildPollResults({ votes, options });

    expect(results.totalVotes).toBe(3);
    expect(results.optionResults).toEqual([
      { id: 'a', text: 'A', count: 2 },
      { id: 'b', text: 'B', count: 2 },
      { id: 'c', text: 'C', count: 0 },
    ]);
  });
});

describe('Poll option append', () => {
  test('allows appending a new option when allowMemberOptions is true', () => {
    const existing = [
      { id: 'a', text: 'A', addedByUid: 'alice' },
    ];
    const proposed = [
      { id: 'a', text: 'A', addedByUid: 'alice' },
      { id: 'b', text: 'B', addedByUid: 'bob' },
    ];

    expect(buildPollOptionAppend(existing, proposed, 'bob', true)).toEqual({
      options: proposed,
    });
  });

  test('rejects option append when not a member', () => {
    const existing = [{ id: 'a', text: 'A' }];
    const proposed = [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }];

    expect(() => buildPollOptionAppend(existing, proposed, 'bob', false)).toThrow();
  });

  test('rejects option append when allowMemberOptions is false', () => {
    const existing = [{ id: 'a', text: 'A' }];
    const proposed = [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }];

    expect(() => buildPollOptionAppend(existing, proposed, 'bob')).toThrow();
  });

  test('rejects option append that modifies or removes existing options', () => {
    const existing = [{ id: 'a', text: 'A' }];
    const proposed = [{ id: 'a', text: 'Changed' }, { id: 'b', text: 'B' }];

    expect(() => buildPollOptionAppend(existing, proposed, 'bob', true)).toThrow();
  });
});
