/**
 * Resilient user-profile loader (ISC-5).
 *
 * The profile bootstrap that runs inside onAuthStateChanged must never throw
 * out of the auth callback — a Firestore failure there leaves setLoading(false)
 * unreached and wedges the app on the loading screen. This helper wraps the
 * getDoc in a try/catch and always resolves to a deterministic shape so the
 * caller can run its loading cleanup in a finally block.
 *
 * Dependencies are injected (db, doc, getDoc, setCachedProfile) to keep the
 * function unit-testable without Firebase, matching the lib/ DI convention.
 *
 * @param {string} uid
 * @param {{
 *   db: unknown,
 *   doc: (db: unknown, collection: string, uid: string) => unknown,
 *   getDoc: (ref: unknown) => Promise<{ exists: () => boolean, data: () => unknown }>,
 *   setCachedProfile: (profile: unknown) => Promise<void>,
 * }} deps
 * @returns {Promise<{ profile: unknown, error?: Error }>}
 */
async function loadUserProfile(uid, deps) {
  const { db, doc, getDoc, setCachedProfile } = deps;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    const profile = snap.exists() ? snap.data() : null;
    if (profile) {
      await setCachedProfile(profile);
    }
    return { profile };
  } catch (error) {
    // Surface the error to the caller but never throw — the auth bootstrap
    // must still be able to clear its loading state.
    return { profile: null, error };
  }
}

module.exports = { loadUserProfile };
module.exports.__esModule = true;
