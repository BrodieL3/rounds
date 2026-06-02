const fs = require('fs');
const path = require('path');

function read(...segments) {
  return fs.readFileSync(path.join(__dirname, '..', '..', ...segments), 'utf8');
}

describe('Companion tagging UI wiring', () => {
  test('rate screen has companion picker', () => {
    const source = read('app', 'venue', '[id]', 'rate.js');
    expect(source).toContain('companions');
    expect(source).toContain('toggleCompanion');
    expect(source).toContain('companionUids');
    expect(source).toContain('styles.companionsWrap');
    expect(source).toContain('styles.companionChip');
  });

  test('post detail shows companion chips', () => {
    const source = read('app', 'post', '[id].js');
    expect(source).toContain('companionUids');
    expect(source).toContain('styles.companionsRow');
    expect(source).toContain('styles.companionChip');
  });

  test('rating payloads support companionUids', () => {
    const source = read('lib', 'ratings', 'rating-payloads.js');
    expect(source).toContain('companionUids');
    expect(source).toContain('normalizeCompanionUids');
  });

  test('rating service passes companionUids through', () => {
    const source = read('lib', 'ratings', 'rating-service.js');
    expect(source).toContain('companionUids');
  });

  test('firestore rules allow companionUids on Rating and Post', () => {
    const source = read('firestore.rules');
    expect(source).toContain('companionUids');
  });
});
