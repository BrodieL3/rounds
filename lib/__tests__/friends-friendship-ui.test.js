const fs = require('fs');
const path = require('path');

describe('Friendship slice UI wiring', () => {
  test('user profile exposes Friendship CTA states separate from Follow', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'user', '[username].js'), 'utf8');

    expect(source).toContain('getFriendshipCta');
    expect(source).toContain('handleFriendshipAction');
    expect(source).toContain('respond_request');
    expect(source).toContain('Message');
    expect(source).toContain('toggleFollow');
  });

  test('Friends tab subscribes to incoming pending requests and supports accept/decline', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'app', '(tabs)', 'friends.js'), 'utf8');

    expect(source).toContain('subscribeIncomingFriendRequests');
    expect(source).toContain('pending requests');
    expect(source).toContain('Accept');
    expect(source).toContain('Decline');
  });
});
