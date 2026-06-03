const fs = require('fs');
const path = require('path');

function read(...segments) {
  return fs.readFileSync(path.join(__dirname, '..', '..', ...segments), 'utf8');
}

describe('native UI media adapter', () => {
  test('media primitive wraps Expo Image with stable native defaults', () => {
    const source = read('components', 'ui', 'media-image.js');

    expect(source).toContain("import { Image as ExpoImage } from 'expo-image'");
    expect(source).toContain('normalizeMediaImageSource');
    expect(source).toContain("contentFit = 'cover'");
    expect(source).toContain("cachePolicy = 'memory-disk'");
    expect(source).toContain('transition = 150');
    expect(source).toContain('<ExpoImage');
  });

  test('feed renders avatars and review media through shared MediaImage primitive', () => {
    const source = read('app', '(tabs)', 'feed.js');

    expect(source).toContain('MediaImage');
    expect(source).toContain("../../components/ui/media-image");
    expect(source).not.toContain('\n  Image,\n');
    expect(source).not.toContain('<Image');
    expect(source).toContain('<MediaImage source={{ uri: getAvatarUri(item) }} style={styles.avatar}');
    expect(source).toContain('<MediaImage key={`${url}-${index}`} source={{ uri: url }} style={styles.mediaImage}');
  });

  test('conversation photo bubbles render single and grid photos through shared MediaImage primitive', () => {
    const source = read('components', 'conversation', 'MessageBubble.js');

    expect(source).toContain('MediaImage');
    expect(source).toContain("../ui/media-image");
    expect(source).not.toContain('\n  Image,\n');
    expect(source).not.toContain('<Image');
    expect(source).toContain('<MediaImage\n                source={{ uri: photoUrls[0] }}');
    expect(source).toContain('<MediaImage\n                    key={message.mediaPaths[index] || index}');
  });

  test('profile avatars render through shared MediaImage primitive', () => {
    const source = read('app', '(tabs)', 'profile.js');

    expect(source).toContain('MediaImage');
    expect(source).toContain("../../components/ui/media-image");
    expect(source).not.toContain('Image, Share');
    expect(source).not.toContain('<Image');
    expect(source).toContain('<MediaImage source={{ uri: profile.photoURL }} style={[styles.avatarImage, avatarStyle]} />');
    expect(source).toContain('<MediaImage source={{ uri: item.avatarUrl }} style={styles.suggestionAvatar} />');
  });

  test('rating photo thumbnails render through shared MediaImage primitive', () => {
    const source = read('app', 'venue', '[id]', 'rate.js');

    expect(source).toContain('MediaImage');
    expect(source).toContain("../../../components/ui/media-image");
    expect(source).not.toContain('\n  Image,\n');
    expect(source).not.toContain('<Image');
    expect(source).toContain('<MediaImage source={{ uri: item }} style={styles.photoThumb} />');
  });

  test('post detail photos render through shared MediaImage primitive', () => {
    const source = read('app', 'post', '[id].js');

    expect(source).toContain('MediaImage');
    expect(source).toContain("../../components/ui/media-image");
    expect(source).not.toContain('TextInput, Image, Alert');
    expect(source).not.toContain('<Image');
    expect(source).toContain('<MediaImage key={`${url}-${i}`} source={{ uri: url }} style={styles.photo} />');
  });

  test('edit profile avatar renders through shared MediaImage primitive', () => {
    const source = read('app', 'edit-profile.js');

    expect(source).toContain('MediaImage');
    expect(source).toContain("../components/ui/media-image");
    expect(source).not.toContain('Alert, Image, Pressable');
    expect(source).not.toContain('<Image');
    expect(source).toContain('<MediaImage source={{ uri: profile.photoURL }} style={[styles.avatarImage, avatarStyle]} />');
  });

  test('onboarding photo preview renders through shared MediaImage primitive', () => {
    const source = read('app', 'onboarding', 'photo.js');

    expect(source).toContain('MediaImage');
    expect(source).toContain("../../components/ui/media-image");
    expect(source).not.toContain('\n  Image,\n');
    expect(source).not.toContain('<Image');
    expect(source).toContain('<MediaImage source={{ uri: url }} style={styles.preview} />');
  });

  test('user profile avatar renders stored profile photos through shared MediaImage primitive', () => {
    const source = read('app', 'user', '[username].js');

    expect(source).toContain('MediaImage');
    expect(source).toContain("../../components/ui/media-image");
    expect(source).toContain('profile?.photoURL');
    expect(source).toContain('<MediaImage source={{ uri: profile.photoURL }} style={styles.avatarImage} />');
    expect(source).toContain('styles.avatarText');
  });
});
