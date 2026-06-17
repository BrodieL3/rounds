const { loadUserProfile } = require('../auth-profile');

function makeDeps(overrides = {}) {
  const cacheSets = [];
  return {
    cacheSets,
    db: 'db',
    doc: (_db, collection, uid) => ({ collection, uid }),
    getDoc: async (ref) => ({
      exists: () => true,
      data: () => ({ uid: ref.uid, onboardingComplete: true }),
    }),
    setCachedProfile: async (profile) => { cacheSets.push(profile); },
    ...overrides,
  };
}

describe('loadUserProfile', () => {
  test('returns the Firestore profile data when the doc exists', async () => {
    const deps = makeDeps();
    const result = await loadUserProfile('user-1', deps);
    expect(result).toEqual({ profile: { uid: 'user-1', onboardingComplete: true } });
  });

  test('caches the profile when one is found', async () => {
    const deps = makeDeps();
    await loadUserProfile('user-1', deps);
    expect(deps.cacheSets).toEqual([{ uid: 'user-1', onboardingComplete: true }]);
  });

  test('returns null profile when the doc does not exist', async () => {
    const deps = makeDeps({
      getDoc: async () => ({ exists: () => false, data: () => null }),
    });
    const result = await loadUserProfile('user-1', deps);
    expect(result).toEqual({ profile: null });
  });

  test('does not cache when no profile is found', async () => {
    const deps = makeDeps({
      getDoc: async () => ({ exists: () => false, data: () => null }),
    });
    await loadUserProfile('user-1', deps);
    expect(deps.cacheSets).toEqual([]);
  });

  // ISC-5: a Firestore failure must NOT throw out of the bootstrap path —
  // it must resolve so the caller can always run setLoading(false).
  test('resolves (does not throw) when getDoc rejects', async () => {
    const deps = makeDeps({
      getDoc: async () => { throw new Error('firestore unavailable'); },
    });
    await expect(loadUserProfile('user-1', deps)).resolves.toBeDefined();
  });

  test('returns null profile and an error flag when getDoc rejects', async () => {
    const boom = new Error('firestore unavailable');
    const deps = makeDeps({ getDoc: async () => { throw boom; } });
    const result = await loadUserProfile('user-1', deps);
    expect(result.profile).toBeNull();
    expect(result.error).toBe(boom);
  });

  test('does not attempt to cache when getDoc rejects', async () => {
    const deps = makeDeps({
      getDoc: async () => { throw new Error('firestore unavailable'); },
    });
    await loadUserProfile('user-1', deps);
    expect(deps.cacheSets).toEqual([]);
  });
});
