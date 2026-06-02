const fs = require('fs');
const path = require('path');

describe('Rating creation UI wiring', () => {
  test('rate screen delegates canonical Rating creation to the service seam', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'venue', '[id]', 'rate.js'), 'utf8');

    expect(source).toContain('createRatingWithProjectionAsync');
    expect(source).not.toContain('createReviewWithMediaAsync');
    expect(source).not.toContain("addDoc(collection(db, 'ratings')");
    expect(source).not.toContain("addDoc(collection(db, 'posts')");
    expect(source).not.toContain('reviewId');
    expect(source).not.toContain('photoURLs');
    expect(source).not.toContain('mediaUrls');
  });
});
