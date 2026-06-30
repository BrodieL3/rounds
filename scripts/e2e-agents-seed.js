/**
 * Provision a roster of E2E "agent" accounts in the Firebase **emulator** —
 * Auth credentials + Firestore user documents — so a multi-agent interaction
 * driver (scripts/e2e-multiagent-driver.js) can sign in as each one and exercise
 * the social graph against the real security rules.
 *
 * Generalizes e2e-auth-seed.js + friends-seed.js (single user) to N agents.
 *
 * Prerequisites:
 *   firebase emulators:start --only auth,firestore,functions,storage
 * Run (node, not bun — see memory rounds-firestore-admin-scripting):
 *   node scripts/e2e-agents-seed.js
 *
 * Safety: refuses to run unless BOTH the Auth and Firestore hosts are local emulators.
 */
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'rounds-8d89f';
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
const FS_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const LOCAL = /^(127\.0\.0\.1|localhost|0\.0\.0\.0):\d+$/;

// HARD GUARD — never touch a real Firebase project.
if (!LOCAL.test(AUTH_HOST)) throw new Error(`Refusing to run: FIREBASE_AUTH_EMULATOR_HOST "${AUTH_HOST}" is not a local emulator.`);
if (!LOCAL.test(FS_HOST)) throw new Error(`Refusing to run: FIRESTORE_EMULATOR_HOST "${FS_HOST}" is not a local emulator.`);
process.env.FIREBASE_AUTH_EMULATOR_HOST = AUTH_HOST;
process.env.FIRESTORE_EMULATOR_HOST = FS_HOST;

const PASSWORD = process.env.E2E_PASSWORD || 'Test1234!';

// uid is intentionally stable + readable so the driver can reference agents by uid.
const AGENTS = [
  { uid: 'agent-alice', username: 'alice', displayName: 'Alice', email: 'alice@example.com' },
  { uid: 'agent-bob', username: 'bob', displayName: 'Bob', email: 'bob@example.com' },
  { uid: 'agent-carol', username: 'carol', displayName: 'Carol', email: 'carol@example.com' },
  { uid: 'agent-dave', username: 'dave', displayName: 'Dave', email: 'dave@example.com' },
];

async function upsertAuthUser(auth, agent) {
  const payload = {
    uid: agent.uid,
    email: agent.email,
    password: PASSWORD,
    emailVerified: true,
    displayName: agent.displayName,
  };
  try {
    await auth.createUser(payload);
    return 'created';
  } catch (e) {
    if (e.code === 'auth/uid-already-exists' || e.code === 'auth/email-already-exists') {
      await auth.updateUser(agent.uid, { email: agent.email, password: PASSWORD });
      return 'reset';
    }
    throw e;
  }
}

async function upsertUserDoc(db, agent) {
  // Profile shape mirrors lib/onboarding.js buildOnboardingProfile (+ follow arrays
  // initialized so the accept-friend follower/following array updates have a base).
  await db.collection('users').doc(agent.uid).set(
    {
      uid: agent.uid,
      displayName: agent.displayName,
      username: agent.username,
      dateOfBirth: '1995-01-01',
      onboardingComplete: true,
      followers: [],
      following: [],
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

async function main() {
  initializeApp({ projectId: PROJECT_ID });
  const auth = getAuth();
  const db = getFirestore();

  for (const agent of AGENTS) {
    const authState = await upsertAuthUser(auth, agent);
    await upsertUserDoc(db, agent);
    console.log(`✓ ${agent.displayName.padEnd(6)} uid=${agent.uid} email=${agent.email} (auth ${authState}, user doc set)`);
  }
  console.log(`\nProvisioned ${AGENTS.length} agents. Password: ${PASSWORD}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('✗ e2e-agents-seed failed:', e);
    process.exit(1);
  });
