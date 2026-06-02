const fs = require('fs');
const path = require('path');

describe('Venue link message UI wiring', () => {
  test('venue detail exposes Share action into conversation picker', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'venue', '[id]', 'index.js'), 'utf8');

    expect(source).toContain('/conversation/share-venue');
    expect(source).toContain('Share');
  });

  test('conversation picker sends venue links to existing DMs and groups', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'conversation', 'share-venue.js'), 'utf8');

    expect(source).toContain('subscribeUserConversations');
    expect(source).toContain('sendDirectVenueLinkMessage');
    expect(source).toContain('sendGroupVenueLinkMessage');
    expect(source).toContain('No chats yet');
  });

  test('conversation route renders tappable venue link cards', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'conversation', '[id].js'), 'utf8');

    expect(source).toContain("item.type === 'venue_link'");
    expect(source).toContain('venueLinkCard');
    expect(source).toContain('/venue/[id]');
  });
});
