const fs = require('fs');
const path = require('path');

function read(...segments) {
  return fs.readFileSync(path.join(__dirname, '..', '..', ...segments), 'utf8');
}

describe('Reactions and reply quotes UI wiring', () => {
  test('conversation surface imports reactions service', () => {
    const hook = read('hooks', 'useConversationSurface.js');

    expect(hook).toContain("from '../lib/friends/reactions-service'");
    expect(hook).toContain('ALLOWED_REACTIONS');
    expect(hook).toContain('buildReactionPayload');
    expect(hook).toContain('toggleMessageReaction');
  });

  test('MessageBubble renders reactions bar and reply preview', () => {
    const hook = read('hooks', 'useConversationSurface.js');
    const bubble = read('components', 'conversation', 'MessageBubble.js');

    expect(bubble).toContain('reactionsBar');
    expect(bubble).toContain('reactionPill');
    expect(bubble).toContain('reactions');
    expect(hook).toContain('onSnapshot');
    expect(bubble).toContain('replyPreview');
    expect(bubble).toContain('replyToMessageId');
  });

  test('Composer has reply composer bar', () => {
    const composer = read('components', 'conversation', 'Composer.js');

    expect(composer).toContain('replyComposerBar');
    expect(composer).toContain('replyComposerLabel');
    expect(composer).toContain('Replying to');
  });
});
