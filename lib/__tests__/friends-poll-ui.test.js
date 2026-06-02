const fs = require('fs');
const path = require('path');

describe('Poll attachment UI wiring', () => {
  test('conversation screen imports poll service', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'conversation', '[id].js'), 'utf8');

    expect(source).toContain("require('../../lib/friends/poll-service')");
    expect(source).toContain('sendDirectPollMessage');
    expect(source).toContain('sendGroupPollMessage');
    expect(source).toContain('castPollVote');
  });

  test('conversation screen renders poll messages', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'conversation', '[id].js'), 'utf8');

    expect(source).toContain("const isPoll = item.type === 'poll';");
    expect(source).toContain('pollCard');
    expect(source).toContain('pollOption');
    expect(source).toContain('pollQuestion');
  });
});
