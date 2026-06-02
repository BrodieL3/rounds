const fs = require('fs');
const path = require('path');

function read(...segments) {
  return fs.readFileSync(path.join(__dirname, '..', '..', ...segments), 'utf8');
}

describe('Review link UI wiring', () => {
  test('share-review screen uses review-link service', () => {
    const source = read('app', 'conversation', 'share-review.js');
    expect(source).toContain('sendDirectReviewLinkMessage');
    expect(source).toContain('sendGroupReviewLinkMessage');
    expect(source).toContain('review');
  });

  test('conversation screen renders review_link cards', () => {
    const source = read('app', 'conversation', '[id].js');
    expect(source).toContain("item.type === 'review_link'");
    expect(source).toContain('styles.reviewLinkCard');
    expect(source).toContain("pathname: '/post/[id]'");
  });

  test('post detail has share review button', () => {
    const source = read('app', 'post', '[id].js');
    expect(source).toContain("/conversation/share-review");
    expect(source).toContain('ratingId');
    expect(source).toContain('venueName');
  });

  test('venue detail popular posts have share buttons', () => {
    const source = read('app', 'venue', '[id]', 'index.js');
    expect(source).toContain("/conversation/share-review");
    expect(source).toContain('ratingShareBtn');
  });
});
