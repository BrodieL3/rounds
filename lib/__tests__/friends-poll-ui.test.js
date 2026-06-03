const fs = require('fs');
const path = require('path');

function read(...segments) {
  return fs.readFileSync(path.join(__dirname, '..', '..', ...segments), 'utf8');
}

describe('Poll attachment UI wiring', () => {
  test('conversation surface imports poll service', () => {
    const hook = read('hooks', 'useConversationSurface.js');

    expect(hook).toContain("require('../lib/friends/poll-service')");
    expect(hook).toContain('sendDirectPollMessage');
    expect(hook).toContain('sendGroupPollMessage');
    expect(hook).toContain('castPollVote');
  });

  test('MessageBubble renders poll messages', () => {
    const bubble = read('components', 'conversation', 'MessageBubble.js');

    expect(bubble).toContain("const isPoll = message.type === 'poll';");
    expect(bubble).toContain('pollCard');
    expect(bubble).toContain('pollOption');
    expect(bubble).toContain('pollQuestion');
  });

  test('Composer renders poll composer', () => {
    const composer = read('components', 'conversation', 'Composer.js');

    expect(composer).toContain('pollComposer');
    expect(composer).toContain('pollOptionInput');
    expect(composer).toContain('Send poll');
  });
});
