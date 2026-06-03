const fs = require('fs');
const path = require('path');

function read(...segments) {
  return fs.readFileSync(path.join(__dirname, '..', '..', ...segments), 'utf8');
}

describe('Venue link message UI wiring', () => {
  test('venue detail exposes Share action into conversation picker', () => {
    const source = read('app', 'venue', '[id]', 'index.js');

    expect(source).toContain('/conversation/share-venue');
    expect(source).toContain('Share');
  });

  test('conversation picker sends venue links to existing DMs and groups', () => {
    const source = read('app', 'conversation', 'share-venue.js');

    expect(source).toContain('subscribeUserConversations');
    expect(source).toContain('sendDirectVenueLinkMessage');
    expect(source).toContain('sendGroupVenueLinkMessage');
    expect(source).toContain('No chats yet');
  });

  test('MessageBubble renders tappable venue link cards', () => {
    const bubble = read('components', 'conversation', 'MessageBubble.js');

    expect(bubble).toContain("const isVenueLink = message.type === 'venue_link';");
    expect(bubble).toContain('venueLinkCard');
    expect(bubble).toContain("pathname: '/venue/[id]'");
  });
});
