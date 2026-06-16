const fs = require('fs');
const path = require('path');

const discoverSourcePath = path.join(__dirname, '../../app/(tabs)/discover.js');

describe('discover action UI', () => {
  test('wires Discover row like, comment, share, and saved-review actions', () => {
    const source = fs.readFileSync(discoverSourcePath, 'utf8');

    expect(source).toContain('buildPostLikeUpdate');
    expect(source).toContain('buildPostBookmarkUpdate');
    expect(source).toContain('buildReviewShareParams');
    expect(source).toContain("router.push(`/post/${item.id}`)");
    expect(source).toContain("pathname: '/conversation/share-review'");
    expect(source).toContain('bookmark');
  });

  test('removes non-functional Discover plus control instead of leaving it disabled', () => {
    const source = fs.readFileSync(discoverSourcePath, 'utf8');

    expect(source).not.toContain('add-circle-outline');
  });
});
