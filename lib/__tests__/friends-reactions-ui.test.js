const fs = require('fs');
const path = require('path');

describe('Reactions and reply quotes UI wiring', () => {
  test('conversation screen imports reactions service', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'conversation', '[id].js'), 'utf8');

    expect(source).toContain("from '../../lib/friends/reactions-service'");
    expect(source).toContain('ALLOWED_REACTIONS');
    expect(source).toContain('buildReactionPayload');
    expect(source).toContain('toggleMessageReaction');
  });

  test('conversation screen renders reactions bar and reply preview', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'conversation', '[id].js'), 'utf8');

    expect(source).toContain('reactionsBar');
    expect(source).toContain('reactionPill');
    expect(source).toContain('messageReactions');
    expect(source).toContain('onSnapshot');
    expect(source).toContain('replyPreview');
    expect(source).toContain('replyComposerBar');
    expect(source).toContain('replyingTo');
  });

  test('conversation screen has React and Reply actions', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'conversation', '[id].js'), 'utf8');

    expect(source).toContain('React');
    expect(source).toContain('Reply');
  });
});
