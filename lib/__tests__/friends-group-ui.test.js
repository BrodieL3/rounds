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

  test('conversation route supports group title, group send, sender labels, and info navigation', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'conversation', '[id].js'), 'utf8');

    expect(source).toContain('sendGroupTextMessage');
    expect(source).toContain("conversation?.type === 'group'");
    expect(source).toContain('senderLabel');
    expect(source).toContain('Start planning in');
    expect(source).toContain('/conversation/[id]/info');
  });

  test('group info route exposes member list, admin controls, add picker, and leave flows', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'conversation', '[id]', 'info.js'), 'utf8');

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
