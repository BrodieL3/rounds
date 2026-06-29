const {
  ConnectionResolveError,
  buildConnectionResolveDocuments,
  resolveConnectionTokenCallable,
} = require('../connection-resolve');

// Minimal fake Firestore, mirroring the harness in group-create.test.js.
class FakeSnap { constructor(d) { this.exists = d !== undefined; this._d = d; } data() { return this._d; } }
class FakeRef { constructor(db, p) { this.db = db; this.path = p; } async get() { return new FakeSnap(this.db.seeded[this.path]); } }
class FakeCol { constructor(db, p) { this.db = db; this.path = p; } doc(id) { return new FakeRef(this.db, `${this.path}/${id}`); } }
class FakeBatch { constructor(db) { this.db = db; this.ops = []; } set(ref, data) { this.ops.push({ path: ref.path, data }); } async commit() { this.ops.forEach((o) => { this.db.writes[o.path] = o.data; }); } }
class FakeDb { constructor(seed = {}) { this.seeded = seed; this.writes = {}; } collection(p) { return new FakeCol(this, p); } batch() { return new FakeBatch(this); } }

const FUTURE = new Date(Date.now() + 3600e3).toISOString();
const PAST = new Date(Date.now() - 3600e3).toISOString();
const deps = (db) => ({ db, now: () => 123, ErrorClass: ConnectionResolveError });

function codeOf(fn) {
  try { fn(); return null; } catch (e) { return e.code; }
}

describe('buildConnectionResolveDocuments', () => {
  const base = { token: 'abc', scannerUid: 'scanner', nowISO: new Date().toISOString(), tokenData: { uid: 'displayer', expiresAt: FUTURE, consumed: false } };

  test('produces a friend request from the scanner to the token owner', () => {
    expect(buildConnectionResolveDocuments(base)).toMatchObject({
      requestId: 'scanner_displayer',
      friendRequest: { fromUid: 'scanner', toUid: 'displayer', status: 'pending' },
    });
  });

  test('rejects an expired token', () => {
    expect(codeOf(() => buildConnectionResolveDocuments({ ...base, tokenData: { uid: 'd', expiresAt: PAST } }))).toBe('deadline-exceeded');
  });

  test('rejects a consumed token (single-use)', () => {
    expect(codeOf(() => buildConnectionResolveDocuments({ ...base, tokenData: { uid: 'd', expiresAt: FUTURE, consumed: true } }))).toBe('failed-precondition');
  });

  test('rejects a missing token doc', () => {
    expect(codeOf(() => buildConnectionResolveDocuments({ ...base, tokenData: undefined }))).toBe('not-found');
  });

  test('rejects connecting to yourself', () => {
    expect(codeOf(() => buildConnectionResolveDocuments({ ...base, tokenData: { uid: 'scanner', expiresAt: FUTURE } }))).toBe('invalid-argument');
  });
});

describe('resolveConnectionTokenCallable', () => {
  test('consumes the token and creates the friend request', async () => {
    const db = new FakeDb({ 'connectionTokens/abc': { uid: 'displayer', expiresAt: FUTURE, consumed: false } });
    const res = await resolveConnectionTokenCallable({ auth: { uid: 'scanner' }, data: { token: 'abc' } }, deps(db));
    expect(res).toMatchObject({ ok: true, requestId: 'scanner_displayer', toUid: 'displayer' });
    expect(db.writes['connectionTokens/abc']).toEqual({ consumed: true });
    expect(db.writes['friendRequests/scanner_displayer']).toMatchObject({ fromUid: 'scanner', toUid: 'displayer', status: 'pending', createdAt: 123 });
  });

  test('rejects an unauthenticated caller', async () => {
    await expect(resolveConnectionTokenCallable({ auth: null, data: { token: 'abc' } }, deps(new FakeDb()))).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  test('rejects a used token end-to-end', async () => {
    const db = new FakeDb({ 'connectionTokens/abc': { uid: 'd', expiresAt: FUTURE, consumed: true } });
    await expect(resolveConnectionTokenCallable({ auth: { uid: 'scanner' }, data: { token: 'abc' } }, deps(db))).rejects.toMatchObject({ code: 'failed-precondition' });
  });
});
