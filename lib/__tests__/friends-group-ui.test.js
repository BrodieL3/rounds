const fs = require('fs');
const path = require('path');

describe('Group chat slice UI wiring', () => {
  test('Friends plus opens group creation route and inbox subscribes to all conversations', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'app', '(tabs)', 'friends.js'), 'utf8');

    expect(source).toContain('/conversation/new');
    expect(source).toContain('subscribeUserConversations');
  });

  test('group creation screen uses Friend picker and callable create action', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'conversation', 'new.js'), 'utf8');

    expect(source).toContain('subscribeGroupCreatableFriends');
    expect(source).toContain('createGroupConversation');
    expect(source).toContain('Group name');
    expect(source).toContain('Create group');
  });

  test('conversation route supports group title, group send, and sender labels', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'conversation', '[id].js'), 'utf8');

    expect(source).toContain('sendGroupTextMessage');
    expect(source).toContain("conversation?.type === 'group'");
    expect(source).toContain('senderLabel');
    expect(source).toContain('Start planning in');
  });
});
