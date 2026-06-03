const fs = require('fs');
const path = require('path');

function read(...segments) {
  return fs.readFileSync(path.join(__dirname, '..', '..', ...segments), 'utf8');
}

describe('Location attachment UI wiring', () => {
  test('conversation surface imports location service', () => {
    const hook = read('hooks', 'useConversationSurface.js');

    expect(hook).toContain("require('../lib/friends/location-service')");
    expect(hook).toContain('sendDirectLocationMessage');
    expect(hook).toContain('sendGroupLocationMessage');
  });

  test('MessageBubble renders location messages', () => {
    const bubble = read('components', 'conversation', 'MessageBubble.js');

    expect(bubble).toContain("message.type === 'location'");
    expect(bubble).toContain('locationCard');
    expect(bubble).toContain('locationLabel');
    expect(bubble).toContain('Linking.openURL');
  });
});
