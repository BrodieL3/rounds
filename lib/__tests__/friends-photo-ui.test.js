const fs = require('fs');
const path = require('path');

describe('Photo attachment UI wiring', () => {
  test('conversation screen imports photo service and picker', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'conversation', '[id].js'), 'utf8');

    expect(source).toContain("require('../../lib/friends/photo-service')");
    expect(source).toContain('pickChatPhotosAsync');
    expect(source).toContain('sendDirectPhotoMessage');
    expect(source).toContain('sendGroupPhotoMessage');
  });

  test('conversation screen renders photo messages with image component', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'conversation', '[id].js'), 'utf8');

    expect(source).toContain("  Image,");
    expect(source).toContain("const isPhoto = item.type === 'photo';");
    expect(source).toContain('photoBubble');
    expect(source).toContain('photoGrid');
    expect(source).toContain('messagePhotoUrls');
    expect(source).toContain("source={{ uri: messagePhotoUrls[0] }}");
  });

  test('conversation screen has attach button and action sheet', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'conversation', '[id].js'), 'utf8');

    expect(source).toContain('showAttachmentMenu');
    expect(source).toContain('attachButton');
    expect(source).toContain("name=\"attach\"");
    expect(source).toContain("text: 'Photo'");
  });
});
