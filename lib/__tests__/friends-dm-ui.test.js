const fs = require('fs');
const path = require('path');

describe('DM slice UI wiring', () => {
  test('Profile Message CTA navigates to canonical conversation route', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'user', '[username].js'), 'utf8');

    expect(source).toContain('buildDirectMessageRouteParams');
    expect(source).toContain('router.push(buildDirectMessageRouteParams');
  });

  test('conversation route supports empty DM and text composer', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'conversation', '[id].js'), 'utf8');

    expect(source).toContain('subscribeConversationMessages');
    expect(source).toContain('sendDirectTextMessage');
    expect(source).toContain('Send');
    expect(source).toContain('Start planning with');
  });

  test('Friends tab subscribes to DM inbox rows and supports hide', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'app', '(tabs)', 'friends.js'), 'utf8');

    expect(source).toContain('subscribeDirectConversations');
    expect(source).toContain('hideConversationForSelf');
    expect(source).toContain('Hide');
    expect(source).toContain('/conversation/[id]');
  });
});
