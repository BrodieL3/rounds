const fs = require('fs');
const path = require('path');

function read(...segments) {
  return fs.readFileSync(path.join(__dirname, '..', '..', ...segments), 'utf8');
}

describe('DM slice UI wiring', () => {
  test('Profile Message CTA navigates to canonical conversation route', () => {
    const source = read('app', 'user', '[username].js');
    expect(source).toContain('buildDirectMessageRouteParams');
    expect(source).toContain('router.push(buildDirectMessageRouteParams');
  });

  test('conversation route supports empty DM and text composer', () => {
    const route = read('app', 'conversation', '[id].js');
    const hook = read('hooks', 'useConversationSurface.js');
    const composer = read('components', 'conversation', 'Composer.js');

    expect(hook).toContain('subscribeConversationMessages');
    expect(hook).toContain('sendDirectTextMessage');
    expect(composer).toContain('Send');
    expect(route).toContain('useConversationSurface');
  });

  test('Friends tab subscribes to inbox rows and supports hide', () => {
    const source = read('app', '(tabs)', 'friends.js');

    expect(source).toContain('subscribeUserConversations');
    expect(source).toContain('hideConversationForSelf');
    expect(source).toContain('Hide');
    expect(source).toContain('/conversation/[id]');
  });
});
