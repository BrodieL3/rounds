const fs = require('fs');
const path = require('path');
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require('@firebase/rules-unit-testing');
const { doc, setDoc } = require('firebase/firestore');

function readStorageRules() {
  return fs.readFileSync(path.join(__dirname, '..', '..', 'storage.rules'), 'utf8');
}

function readFirestoreRules() {
  return fs.readFileSync(path.join(__dirname, '..', '..', 'firestore.rules'), 'utf8');
}

function emulatorProjectId() {
  if (process.env.FIREBASE_CONFIG) {
    try {
      return JSON.parse(process.env.FIREBASE_CONFIG).projectId || 'rounds-8d89f';
    } catch (error) {
      return 'rounds-8d89f';
    }
  }
  return process.env.GCLOUD_PROJECT || 'rounds-8d89f';
}

async function seedRatingMedia(testEnv, { ratingId, userId, visibility, sharedUid }) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'ratings', ratingId), { userId, visibility });
    if (sharedUid) {
      await setDoc(doc(context.firestore(), 'users', sharedUid, 'sharedRatings', ratingId), {
        revokedAt: null,
      });
    }
    await context.storage()
      .ref(`ratings/${ratingId}/photo_1_0.jpg`)
      .putString('x', 'raw', { contentType: 'image/jpeg' });
  });
}

const storageEmulatorAvailable = Boolean(
  process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_STORAGE_EMULATOR_HOST
);
const describeStorageRules = storageEmulatorAvailable ? describe : describe.skip;

let testEnv;

beforeAll(async () => {
  if (!storageEmulatorAvailable) return;

  testEnv = await initializeTestEnvironment({
    projectId: emulatorProjectId(),
    firestore: { rules: readFirestoreRules() },
    storage: { rules: readStorageRules() },
  });
});

beforeEach(async () => {
  if (!testEnv) return;
  await testEnv.clearFirestore();
  await testEnv.clearStorage();
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

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

  test('share media lookup uses Storage Rules firestore helpers', () => {
    const rules = readStorageRules();

    expect(rules).toContain('firestore.exists(sharePath)');
    expect(rules).toContain('firestore.get(sharePath).data.revokedAt == null');
  });
});

describeStorageRules('Storage emulator rules for Rating media', () => {
  test('allows public Rating media read, owner private read, and active shared unlisted read', async () => {
    await seedRatingMedia(testEnv, {
      ratingId: 'public1',
      userId: 'alice',
      visibility: 'public',
    });
    await seedRatingMedia(testEnv, {
      ratingId: 'private1',
      userId: 'alice',
      visibility: 'private',
    });
    await seedRatingMedia(testEnv, {
      ratingId: 'unlisted1',
      userId: 'alice',
      visibility: 'unlisted',
      sharedUid: 'bob',
    });

    await assertSucceeds(
      testEnv.unauthenticatedContext().storage().ref('ratings/public1/photo_1_0.jpg').getDownloadURL()
    );
    await assertFails(
      testEnv.unauthenticatedContext().storage().ref('ratings/private1/photo_1_0.jpg').getDownloadURL()
    );
    await assertSucceeds(
      testEnv.authenticatedContext('alice').storage().ref('ratings/private1/photo_1_0.jpg').getDownloadURL()
    );
    await assertSucceeds(
      testEnv.authenticatedContext('bob').storage().ref('ratings/unlisted1/photo_1_0.jpg').getDownloadURL()
    );
  });
});
