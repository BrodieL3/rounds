const fs = require('fs');
const path = require('path');

function read(...segments) {
  return fs.readFileSync(path.join(__dirname, '..', '..', ...segments), 'utf8');
}

// F3 slice 1: a brand-new, zero-friends, zero-log user can complete
// find -> tap -> log -> rate -> "it saved" entirely solo, through the
// EXISTING canonical Rating write path (ADR 005). No parallel write path.

describe('Log-a-visit loop — venue detail CTA', () => {
  const source = read('app', 'venue', '[id]', 'index.js');

  test('venue detail exposes a single prominent "Log a visit" CTA', () => {
    expect(source).toContain('Log a visit');
  });

  test('the CTA routes into the canonical rate flow', () => {
    expect(source).toContain('/venue/${encodeURIComponent(venue.id)}/rate');
  });

  test('does not invent a parallel logging copy that competes with the hero CTA', () => {
    // The old ambiguous "Rate this place" label is replaced by the hero CTA.
    expect(source).not.toContain('Rate this place');
  });
});

describe('Log-a-visit loop — rate screen persists + confirms', () => {
  const source = read('app', 'venue', '[id]', 'rate.js');

  test('persists through the EXISTING canonical rating-service (ADR 005)', () => {
    expect(source).toContain('createRatingWithProjectionAsync');
    // No parallel write path invented for the slice.
    expect(source).not.toContain("addDoc(collection(db, 'ratings')");
    expect(source).not.toContain("addDoc(collection(db, 'posts')");
  });

  test('offers all three canonical sentiments (loved / fine / disliked)', () => {
    expect(source).toContain("sentimentButton('loved'");
    expect(source).toContain("sentimentButton('fine'");
    expect(source).toContain("sentimentButton('disliked'");
  });

  test('shows a clear save confirmation after a successful log', () => {
    expect(source).toContain('buildLogConfirmation');
    // The confirmation is surfaced to the user, keyed on the chosen sentiment + venue.
    expect(source).toContain('confirmation.title');
    expect(source).toContain('confirmation.message');
  });

  test('the confirmation fires on a successful create (after the service returns success)', () => {
    // The confirmation CALL (not the import) must sit on the success branch:
    // after the `if (!result.success) throw` guard, and the Alert must be raised
    // with the built confirmation — unconditionally, not only on the compare path.
    const successGuardIndex = source.indexOf('if (!result.success)');
    const confirmCallIndex = source.indexOf('buildLogConfirmation(');
    expect(successGuardIndex).toBeGreaterThan(-1);
    expect(confirmCallIndex).toBeGreaterThan(successGuardIndex);
    expect(source).toContain('Alert.alert(confirmation.title, confirmation.message');
  });

  test('REGRESSION: existing companion + preview enrichments survive the slice', () => {
    // Slice 1 is additive — it must NOT strip the social/preview surface that
    // other passing suites (rating-companion-ui, rating-ui) assert on.
    expect(source).toContain('toggleCompanion');
    expect(source).toContain('companionUids');
    expect(source).toContain('styles.companionsWrap');
    expect(source).toContain('styles.previewCard');
  });
});
