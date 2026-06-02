const fs = require('fs');
const path = require('path');

function readStorageRules() {
  return fs.readFileSync(path.join(__dirname, '..', '..', 'storage.rules'), 'utf8');
}

describe('Storage rules for Rating media', () => {
  test('adds canonical Rating media path while preserving legacy review media path', () => {
    const rules = readStorageRules();

    expect(rules).toContain('match /ratings/{ratingId}/{fileName}');
    expect(rules).toContain('match /reviews/{reviewId}/{fileName}');
    expect(rules).toContain('fileName.matches(\'photo_[0-9]+_[0-9]+\\\\.jpg\')');
  });

  test('writes cannot depend on Rating docs that do not exist yet, but reads use visibility/owner gate', () => {
    const rules = readStorageRules();

    expect(rules).toContain('allow write: if request.auth != null');
    expect(rules).toContain('request.resource.contentType.matches(\'image/.*\')');
    expect(rules).toContain("rating.data.visibility == 'public'");
    expect(rules).toContain('rating.data.userId == request.auth.uid');
  });

  test('share media path hardcodes (default) database, not $(database) variable', () => {
    const rules = readStorageRules();

    expect(rules).toContain('/databases/(default)/documents/users/$(uid)/sharedRatings/$(ratingId)');
    expect(rules).not.toContain('$(database)/documents/users/$(uid)/sharedRatings');
  });

  test('canReadRatingMedia guards share lookup behind request.auth != null', () => {
    const rules = readStorageRules();

    expect(rules).toContain('request.auth != null && hasActiveShareForMedia(request.auth.uid, ratingId)');
  });
});
