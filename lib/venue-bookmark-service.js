const { buildBookmarkPayload } = require('./venue-bookmarks');

function normalizeError(error) {
  return error?.message || String(error) || 'Bookmark operation failed';
}

function getDefaultDeps() {
  const { doc, getDoc, setDoc, deleteDoc, serverTimestamp } = require('firebase/firestore');
  const { db } = require('./firebase');

  return {
    db,
    serverTimestamp,
    getDoc,
    setDoc,
    deleteDoc,
    bookmarkRef: (uid, venueId) => doc(db, 'users', uid, 'venueBookmarks', venueId),
  };
}

function withDefaultDeps(deps = {}) {
  const required = ['bookmarkRef', 'getDoc', 'setDoc', 'deleteDoc'];
  if (required.every((key) => deps[key])) return deps;
  return { ...getDefaultDeps(), ...deps };
}

async function getBookmarkAsync(uid, venueId, deps = {}) {
  const api = withDefaultDeps(deps);
  try {
    const snap = await api.getDoc(api.bookmarkRef(uid, venueId));
    return { exists: snap.exists(), data: snap.exists() ? snap.data() : null };
  } catch (error) {
    return { exists: false, data: null, error: normalizeError(error) };
  }
}

async function setBookmarkAsync(uid, venue, deps = {}) {
  const api = withDefaultDeps(deps);
  try {
    const payload = buildBookmarkPayload({
      venueId: venue.id,
      venueName: venue.name,
      city: venue.city,
      cohort: venue.cohort,
    });
    await api.setDoc(api.bookmarkRef(uid, venue.id), payload);
    return { success: true };
  } catch (error) {
    return { success: false, error: normalizeError(error) };
  }
}

async function removeBookmarkAsync(uid, venueId, deps = {}) {
  const api = withDefaultDeps(deps);
  try {
    await api.deleteDoc(api.bookmarkRef(uid, venueId));
    return { success: true };
  } catch (error) {
    return { success: false, error: normalizeError(error) };
  }
}

module.exports = {
  getBookmarkAsync,
  setBookmarkAsync,
  removeBookmarkAsync,
  withDefaultDeps,
};
