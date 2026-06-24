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

  test('VenuePanel replaces the location option: ranked venues + search + venue_link send', () => {
    const panel = read('components', 'conversation', 'panels', 'VenuePanel.js');
    const menu = read('components', 'conversation', 'AttachmentMenu.js');
    const hook = read('hooks', 'useConversationSurface.js');

    expect(panel).toContain('buildStackRankings'); // ranked from the user's #1
    expect(panel).toContain('Search venues');
    expect(panel).toContain('onSendVenue');
    expect(menu).toContain("label: 'Venue'");
    expect(hook).toContain('sendVenueLink');
    expect(hook).toContain('venue-link-service');
  });
});
