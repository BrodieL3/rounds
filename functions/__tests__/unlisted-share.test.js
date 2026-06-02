const { sharePrivateRatingCallable } = require('../unlisted-share');

describe('sharePrivateRating callable', () => {
  function makeDeps(overrides = {}) {
    const docs = {};
    const collections = {};

    function getDoc(path) {
      return docs[path] || null;
    }

    function setDoc(path, data) {
      docs[path] = { exists: true, id: path.split('/').pop(), data: () => data };
    }

    function makeRef(path) {
      return {
        path,
        get: async () => getDoc(path) || { exists: false, data: () => null },
        set: async (data) => setDoc(path, data),
        collection: (name) => makeCollection(`${path}/${name}`),
      };
    }

    function makeCollection(path) {
      return {
        path,
        doc: (id) => makeRef(`${path}/${id}`),
        where: (field, op, value) => ({
          get: async () => {
            const prefix = `${path}/`;
            const matching = Object.entries(docs)
              .filter(([p, d]) => p.startsWith(prefix) && d.data()[field] === value)
              .map(([, d]) => d);
            return { docs: matching };
          },
        }),
      };
    }

    return {
      docs,
      setDoc,
      db: {
        collection: (name) => makeCollection(name),
        batch: () => {
          const ops = [];
          return {
            set: (ref, data) => ops.push({ type: 'set', ref: ref.path, data }),
            commit: async () => {
              ops.forEach((op) => {
                if (op.type === 'set') setDoc(op.ref, op.data);
              });
            },
            _ops: ops,
          };
        },
      },
      ErrorClass: class TestError extends Error {
        constructor(code, message) {
          super(message);
          this.code = code;
        }
      },
      now: () => 'SERVER_TIME',
      ...overrides,
    };
  }

  test('shares unlisted rating to conversation for all active members', async () => {
    const deps = makeDeps();
    deps.setDoc('ratings/rating1', { userId: 'alice', visibility: 'unlisted' });
    deps.setDoc('conversations/conv1', { type: 'group', memberUids: ['alice', 'bob'] });
    deps.setDoc('conversations/conv1/members/alice', { leftAt: null });
    deps.setDoc('conversations/conv1/members/bob', { leftAt: null });

    const result = await sharePrivateRatingCallable(
      { auth: { uid: 'alice' }, data: { ratingId: 'rating1', conversationId: 'conv1' } },
      deps
    );

    expect(result).toEqual({ success: true, sharedMemberCount: 2 });
    expect(deps.docs['ratings/rating1/shares/conv1']).toBeTruthy();
    expect(deps.docs['users/alice/sharedRatings/rating1']).toBeTruthy();
    expect(deps.docs['users/bob/sharedRatings/rating1']).toBeTruthy();
  });

  test('rejects unauthenticated', async () => {
    const deps = makeDeps();
    await expect(
      sharePrivateRatingCallable({ auth: null, data: { ratingId: 'r1', conversationId: 'c1' } }, deps)
    ).rejects.toThrow('Sign in');
  });

  test('rejects non-owner', async () => {
    const deps = makeDeps();
    deps.setDoc('ratings/rating1', { userId: 'alice', visibility: 'private' });
    deps.setDoc('conversations/conv1', {});
    deps.setDoc('conversations/conv1/members/bob', { leftAt: null });

    await expect(
      sharePrivateRatingCallable(
        { auth: { uid: 'bob' }, data: { ratingId: 'rating1', conversationId: 'conv1' } },
        deps
      )
    ).rejects.toThrow('owner');
  });

  test('rejects public rating shares', async () => {
    const deps = makeDeps();
    deps.setDoc('ratings/rating1', { userId: 'alice', visibility: 'public' });
    deps.setDoc('conversations/conv1', {});
    deps.setDoc('conversations/conv1/members/alice', { leftAt: null });

    await expect(
      sharePrivateRatingCallable(
        { auth: { uid: 'alice' }, data: { ratingId: 'rating1', conversationId: 'conv1' } },
        deps
      )
    ).rejects.toThrow('Public');
  });

  test('rejects non-member', async () => {
    const deps = makeDeps();
    deps.setDoc('ratings/rating1', { userId: 'alice', visibility: 'private' });
    deps.setDoc('conversations/conv1', {});
    deps.setDoc('conversations/conv1/members/bob', { leftAt: null });

    await expect(
      sharePrivateRatingCallable(
        { auth: { uid: 'alice' }, data: { ratingId: 'rating1', conversationId: 'conv1' } },
        deps
      )
    ).rejects.toThrow('active member');
  });

  test('rejects duplicate active share', async () => {
    const deps = makeDeps();
    deps.setDoc('ratings/rating1', { userId: 'alice', visibility: 'unlisted' });
    deps.setDoc('conversations/conv1', {});
    deps.setDoc('conversations/conv1/members/alice', { leftAt: null });
    deps.setDoc('ratings/rating1/shares/conv1', { revokedAt: null });

    await expect(
      sharePrivateRatingCallable(
        { auth: { uid: 'alice' }, data: { ratingId: 'rating1', conversationId: 'conv1' } },
        deps
      )
    ).rejects.toThrow('already shared');
  });
});
