const { validateSignupInput, mapAuthError } = require('../auth-signup');

describe('validateSignupInput', () => {
  test('accepts a well-formed email and 6+ char password', () => {
    expect(validateSignupInput('person@example.com', 'hunter2')).toEqual({ ok: true });
  });

  test('trims the email before validating', () => {
    expect(validateSignupInput('  person@example.com  ', 'hunter2')).toEqual({ ok: true });
  });

  test('rejects a missing email', () => {
    const result = validateSignupInput('', 'hunter2');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/email/i);
  });

  test('rejects an email with no @', () => {
    const result = validateSignupInput('not-an-email', 'hunter2');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/email/i);
  });

  test('rejects a missing password', () => {
    const result = validateSignupInput('person@example.com', '');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/password/i);
  });

  test('rejects a password shorter than 6 characters (Firebase minimum)', () => {
    const result = validateSignupInput('person@example.com', 'short');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/6 characters/i);
  });
});

describe('mapAuthError', () => {
  test('maps email-already-in-use to a friendly message', () => {
    expect(mapAuthError({ code: 'auth/email-already-in-use' })).toMatch(/already/i);
  });

  test('maps invalid-email to a friendly message', () => {
    expect(mapAuthError({ code: 'auth/invalid-email' })).toMatch(/valid email/i);
  });

  test('maps weak-password to a friendly message', () => {
    expect(mapAuthError({ code: 'auth/weak-password' })).toMatch(/password/i);
  });

  test('maps network-request-failed to a connection message', () => {
    expect(mapAuthError({ code: 'auth/network-request-failed' })).toMatch(/connection/i);
  });

  test('falls back to a generic message for unknown codes', () => {
    expect(mapAuthError({ code: 'auth/some-new-code' })).toMatch(/try again/i);
  });

  test('falls back to a generic message when there is no code', () => {
    expect(mapAuthError(undefined)).toMatch(/try again/i);
  });
});
