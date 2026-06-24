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

  test('PollPanel renders the poll composer, gated to group chats', () => {
    const panel = read('components', 'conversation', 'panels', 'PollPanel.js');
    const menu = read('components', 'conversation', 'AttachmentMenu.js');

    expect(panel).toContain('Send poll');
    expect(panel).toContain('Add option');
    expect(panel).toContain('Allow multiple');
    // Poll attach option only shows in group chats.
    expect(menu).toMatch(/key:\s*'poll'[\s\S]*groupOnly:\s*true/);
    expect(menu).toContain('opt.groupOnly || isGroup');
  });
});
