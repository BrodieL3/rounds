const fs = require('fs');
const path = require('path');

function read(...segments) {
  return fs.readFileSync(path.join(__dirname, '..', '..', ...segments), 'utf8');
}

describe('Photo attachment UI wiring', () => {
  test('conversation surface imports photo service and picker', () => {
    const hook = read('hooks', 'useConversationSurface.js');

    expect(hook).toContain("require('../lib/friends/photo-service')");
    expect(hook).toContain('pickChatPhotosAsync');
    expect(hook).toContain('sendDirectPhotoMessage');
    expect(hook).toContain('sendGroupPhotoMessage');
  });

  test('MessageBubble renders photo messages with image component', () => {
    const bubble = read('components', 'conversation', 'MessageBubble.js');

    expect(bubble).toContain('Image,');
    expect(bubble).toContain("const isPhoto = message.type === 'photo';");
    expect(bubble).toContain('photoBubble');
    expect(bubble).toContain('photoGrid');
    expect(bubble).toContain('photoUrls');
    expect(bubble).toContain("source={{ uri: photoUrls[0] }}");
  });

  test('Composer has attach button and AttachmentMenu wires Photo', () => {
    const composer = read('components', 'conversation', 'Composer.js');
    const menu = read('components', 'conversation', 'AttachmentMenu.js');
    const route = read('app', 'conversation', '[id].js');

    expect(composer).toContain('attachButton');
    expect(route).toContain('showAttachmentMenu');
    expect(menu).toContain("text: 'Photo'");
  });
});
