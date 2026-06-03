const fs = require('fs');
const path = require('path');

function read(...segments) {
  return fs.readFileSync(path.join(__dirname, '..', '..', ...segments), 'utf8');
}

describe('Friends safety UI wiring', () => {
  test('Profile exposes block and report actions through safety service', () => {
    const source = read('app', 'user', '[username].js');

    expect(source).toContain('blockUser');
    expect(source).toContain('buildReportPayload');
    expect(source).toContain('Block user');
    expect(source).toContain('Report user');
  });

  test('Conversation surface exposes hide, delete-for-everyone, and report actions', () => {
    const hook = read('hooks', 'useConversationSurface.js');
    const bubble = read('components', 'conversation', 'MessageBubble.js');

    expect(hook).toContain('hideMessageForSelf');
    expect(hook).toContain('deleteMessageForEveryone');
    expect(hook).toContain('reportTarget');
    expect(bubble).toContain('Delete for everyone');
    expect(bubble).toContain('Hide message');
    expect(bubble).toContain('Report message');
  });
});
