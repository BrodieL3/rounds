const fs = require('fs');
const path = require('path');

function read(...segments) {
  return fs.readFileSync(path.join(__dirname, '..', '..', ...segments), 'utf8');
}

describe('Unlisted share UI wiring', () => {
  test('share-review screen calls sharePrivateRating for non-public ratings', () => {
    const source = read('app', 'conversation', 'share-review.js');
    expect(source).toContain('sharePrivateRating');
    expect(source).toContain("review.visibility !== 'public'");
  });

  test('MessageBubble review_link shows Unlisted tag', () => {
    const bubble = read('components', 'conversation', 'MessageBubble.js');
    expect(bubble).toContain('Unlisted');
    expect(bubble).toContain('styles.unlistedTag');
  });

  test('post detail falls back to ratings for unlisted', () => {
    const source = read('app', 'post', '[id].js');
    expect(source).toContain("doc(db, 'ratings', id)");
    expect(source).toContain('Fallback to ratings');
  });

  test('profile shows share button on own reviews', () => {
    const source = read('app', 'user', '[username].js');
    expect(source).toContain("/conversation/share-review");
    expect(source).toContain('styles.reviewShareBtn');
  });
});
