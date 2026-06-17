/**
 * Pure, UI-agnostic helpers for the email/password signup flow (ISC-1).
 *
 * Kept free of React and Firebase imports so the validation and error-mapping
 * logic is unit-testable in the repo's node test environment (no JSX transform),
 * matching the dependency-light convention used across lib/.
 */

const PASSWORD_MIN_LENGTH = 6; // Firebase Auth minimum for email/password.

/**
 * Validate signup input before hitting the auth provider.
 * @param {string} email
 * @param {string} password
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
function validateSignupInput(email, password) {
  const trimmedEmail = (email || '').trim();
  if (!trimmedEmail) {
    return { ok: false, error: 'Enter your email.' };
  }
  if (!trimmedEmail.includes('@')) {
    return { ok: false, error: 'Enter a valid email.' };
  }
  if (!password) {
    return { ok: false, error: 'Enter a password.' };
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { ok: false, error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.` };
  }
  return { ok: true };
}

const AUTH_ERROR_MESSAGES = {
  'auth/email-already-in-use': 'That email already has an account. Try signing in.',
  'auth/invalid-email': 'Enter a valid email.',
  'auth/weak-password': `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
  'auth/network-request-failed': 'Connection problem. Check your network and try again.',
};

/**
 * Map a Firebase auth error to a friendly, user-facing message.
 * @param {{ code?: string } | undefined | null} error
 * @returns {string}
 */
function mapAuthError(error) {
  const code = error && error.code;
  return AUTH_ERROR_MESSAGES[code] || 'Could not create your account. Please try again.';
}

module.exports = { validateSignupInput, mapAuthError, PASSWORD_MIN_LENGTH };
module.exports.__esModule = true;
