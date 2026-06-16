/**
 * Seed the Firebase **Auth emulator** with a known password-backed user so the
 * login screen has something to authenticate against during E2E tests.
 *
 * friends-seed.js seeds Firestore user *documents* (uid `test-alice`) but no Auth
 * account — without this, `signInWithEmailAndPassword` has no credential to match.
 * This creates the matching Auth user (same uid) so post-login Alice's seeded
 * friends/conversations render.
 *
 * Prerequisites:
 *   npm install                 (firebase-admin)
 *   firebase emulators:start --only auth,firestore
 *
 * Run:
 *   node scripts/e2e-auth-seed.js
 *
 * Safety: refuses to run unless the Auth host is a local emulator.
 */

const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'rounds-8d89f';
const AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';

// HARD GUARD — never touch a real Firebase project.
if (!/^(127\.0\.0\.1|localhost|0\.0\.0\.0):\d+$/.test(AUTH_EMULATOR_HOST)) {
  throw new Error(
    `Refusing to run: FIREBASE_AUTH_EMULATOR_HOST "${AUTH_EMULATOR_HOST}" is not a local emulator.`
  );
}
process.env.FIREBASE_AUTH_EMULATOR_HOST = AUTH_EMULATOR_HOST;

const TEST_USER = {
  uid: process.env.E2E_UID || 'test-alice',
  email: process.env.E2E_EMAIL || 'alice@example.com',
  password: process.env.E2E_PASSWORD || 'Test1234!',
  emailVerified: true,
  displayName: 'Alice',
};

async function main() {
  initializeApp({ projectId: PROJECT_ID });
  const auth = getAuth();

  try {
    await auth.createUser(TEST_USER);
    console.log(`✓ Created auth user ${TEST_USER.email} (uid ${TEST_USER.uid})`);
  } catch (e) {
    if (e.code === 'auth/uid-already-exists' || e.code === 'auth/email-already-exists') {
      await auth.updateUser(TEST_USER.uid, {
        email: TEST_USER.email,
        password: TEST_USER.password,
      });
      console.log(`✓ Auth user ${TEST_USER.email} already existed — password reset.`);
    } else {
      throw e;
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('✗ e2e-auth-seed failed:', e);
    process.exit(1);
  });
