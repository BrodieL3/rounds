const fs = require('fs');
const path = require('path');

function read(...segments) {
  return fs.readFileSync(path.join(__dirname, '..', '..', ...segments), 'utf8');
}

describe('Group chat slice UI wiring', () => {
  test('Friends plus opens group creation route and inbox subscribes to all conversations', () => {
    const source = read('app', '(tabs)', 'friends.js');

    expect(source).toContain('/conversation/new');
    expect(source).toContain('subscribeUserConversations');
  });

  test('group creation screen uses Friend picker and callable create action', () => {
    const source = read('app', 'conversation', 'new.js');

    expect(source).toContain('subscribeGroupCreatableFriends');
    expect(source).toContain('createGroupConversation');
    expect(source).toContain('Group name');
    expect(source).toContain('Create group');
  });

  test('conversation route supports group title, group send, sender labels, and info navigation', () => {
    const route = read('app', 'conversation', '[id].js');
    const hook = read('hooks', 'useConversationSurface.js');
    const bubble = read('components', 'conversation', 'MessageBubble.js');

    expect(hook).toContain('sendGroupTextMessage');
    expect(route).toContain("isGroup");
    expect(bubble).toContain('senderLabel');
    expect(route).toContain('/conversation/[id]/info');
  });

  test('group info route exposes member list, admin controls, add picker, and leave flows', () => {
    const source = read('app', 'conversation', '[id]', 'info.js');

    expect(source).toContain('loadGroupInfoMembers');
    expect(source).toContain('buildGroupInfoViewModel');
    expect(source).toContain('getAddableGroupFriends');
    expect(source).toContain('inviteToGroup');
    expect(source).toContain('removeGroupMember');
    expect(source).toContain('leaveGroup');
    expect(source).toContain('Add members');
    expect(source).toContain('Admin');
    expect(source).toContain('Remove');
    expect(source).toContain('Leave group');
    expect(source).toContain('nextAdminUid');
    expect(source).toContain('Conversation not found');
  });
});
