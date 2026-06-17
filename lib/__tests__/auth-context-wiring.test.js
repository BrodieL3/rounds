const fs = require('fs');
const path = require('path');

const contextSource = fs.readFileSync(
  path.join(__dirname, '../../contexts/AuthContext.js'),
  'utf8'
);

describe('AuthContext signUp wiring (ISC-1)', () => {
  test('imports createUserWithEmailAndPassword from firebase/auth', () => {
    expect(contextSource).toContain('createUserWithEmailAndPassword');
  });

  test('exposes signUp through the context value', () => {
    expect(contextSource).toMatch(/signUp/);
    // signUp must be part of the provided context value object
    expect(contextSource).toMatch(/value=\{\{[^}]*signUp[^}]*\}\}/s);
  });
});

describe('AuthContext bootstrap resilience (ISC-5)', () => {
  test('delegates profile loading to the resilient loadUserProfile helper', () => {
    expect(contextSource).toContain('loadUserProfile');
  });

  test('guarantees setLoading(false) runs in a finally block', () => {
    // The onAuthStateChanged handler must clear loading even if profile load fails.
    expect(contextSource).toMatch(/finally\s*\{[^}]*setLoading\(false\)[^}]*\}/s);
  });

  test('no longer awaits a bare getDoc directly inside onAuthStateChanged', () => {
    // Resilience is centralized in loadUserProfile; the handler should not
    // contain an unguarded getDoc await of its own.
    const handlerMatch = contextSource.match(
      /onAuthStateChanged\(auth, async[\s\S]*?\n {4}\}\);/
    );
    expect(handlerMatch).not.toBeNull();
    expect(handlerMatch[0]).not.toContain('await getDoc');
  });
});
