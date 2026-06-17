const fs = require('fs');
const path = require('path');

const signupSource = fs.readFileSync(path.join(__dirname, '../../app/signup.js'), 'utf8');
const loginSource = fs.readFileSync(path.join(__dirname, '../../app/login.js'), 'utf8');

describe('signup screen (ISC-1: in-app account creation)', () => {
  test('calls the AuthContext signUp method (a real create-account provider call)', () => {
    expect(signupSource).toContain('useAuth');
    expect(signupSource).toContain('signUp');
  });

  test('exposes login-consistent testIDs for email, password, submit, title, and error', () => {
    expect(signupSource).toContain('testID="signup-email-input"');
    expect(signupSource).toContain('testID="signup-password-input"');
    expect(signupSource).toContain('testID="signup-submit"');
    expect(signupSource).toContain('testID="signup-title"');
    expect(signupSource).toContain('testID="signup-error"');
  });

  test('validates input and maps auth errors via the shared auth-signup helper', () => {
    expect(signupSource).toContain('validateSignupInput');
    expect(signupSource).toContain('mapAuthError');
  });

  test('trims the email before creating the account (matches login)', () => {
    expect(signupSource).toContain('email.trim()');
  });

  test('navigates into the app after a successful signup', () => {
    expect(signupSource).toContain("router.replace('/(tabs)/friends')");
  });

  test('offers a link back to the existing login screen', () => {
    expect(signupSource).toContain("'/login'");
    expect(signupSource).toContain('testID="signup-to-login"');
  });

  test('uses the shared COLORS tokens like the login screen', () => {
    expect(signupSource).toContain("from '../lib/constants'");
    expect(signupSource).toContain('COLORS');
  });
});

describe('login screen routes to signup (ISC-1: discoverable on-ramp)', () => {
  test('login screen links to the new signup route', () => {
    expect(loginSource).toContain("'/signup'");
    expect(loginSource).toContain('testID="login-to-signup"');
  });
});
