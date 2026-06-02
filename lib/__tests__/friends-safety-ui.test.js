const fs = require('fs');
const path = require('path');

describe('Friends safety UI wiring', () => {
  test('Profile exposes block and report actions through safety service', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'user', '[username].js'), 'utf8');

    expect(source).toContain('blockUser');
    expect(source).toContain('buildReportPayload');
    expect(source).toContain('Block user');
    expect(source).toContain('Report user');
  });

  test('Conversation messages expose hide, delete-for-everyone, and report actions', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'conversation', '[id].js'), 'utf8');

    expect(source).toContain('hideMessageForSelf');
    expect(source).toContain('deleteMessageForEveryone');
    expect(source).toContain('reportTarget');
    expect(source).toContain('Delete for everyone');
    expect(source).toContain('Hide message');
    expect(source).toContain('Report message');
  });
});
