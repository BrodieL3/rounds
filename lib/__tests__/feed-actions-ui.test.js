const fs = require('fs');
const path = require('path');

const feedSourcePath = path.join(__dirname, '../../app/(tabs)/feed.js');

describe('feed action UI', () => {
  test('wires feed row like, comment, share, and saved-review actions', () => {
    const source = fs.readFileSync(feedSourcePath, 'utf8');

    expect(source).toContain('buildPostLikeUpdate');
    expect(source).toContain('buildPostBookmarkUpdate');
    expect(source).toContain('buildReviewShareParams');
    expect(source).toContain("router.push(`/post/${item.id}`)");
    expect(source).toContain("pathname: '/conversation/share-review'");
    expect(source).toContain('bookmark');
  });

  test('removes non-functional feed plus control instead of leaving it disabled', () => {
    const source = fs.readFileSync(feedSourcePath, 'utf8');

    expect(source).not.toContain('add-circle-outline');
  });
});
