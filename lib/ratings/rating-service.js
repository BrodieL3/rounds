const { buildRatingCreation } = require('./rating-payloads');

function normalizeError(error) {
  return error?.message || String(error) || 'Rating creation failed';
}

function getDefaultDeps() {
  const { collection, doc, serverTimestamp, writeBatch } = require('firebase/firestore');
  const { deleteObject, ref } = require('firebase/storage');
  const { db, storage } = require('../firebase');
  const { uploadRatingPhotosAsync } = require('../media-upload');

  return {
    db,
    storage,
    serverTimestamp,
    writeBatch,
    newRatingRef: () => doc(collection(db, 'ratings')),
    postRefForRating: (ratingId) => doc(db, 'posts', ratingId),
    uploadRatingPhotosAsync,
    deleteStoragePathsAsync: async (paths = []) => {
      await Promise.all(paths.map((path) => deleteObject(ref(storage, path)).catch(() => null)));
    },
  };
}

function withDefaultDeps(deps = {}) {
  const required = ['serverTimestamp', 'writeBatch', 'newRatingRef', 'postRefForRating', 'uploadRatingPhotosAsync'];
  if (required.every((key) => deps[key])) return deps;
  return { ...getDefaultDeps(), ...deps };
}

async function createRatingWithProjectionAsync(input = {}, deps = {}) {
  const api = withDefaultDeps(deps);
  const ratingRef = api.newRatingRef();
  const ratingId = ratingRef?.id;
  const localPhotoUris = Array.isArray(input.localPhotoUris) ? input.localPhotoUris : [];

  let mediaPaths = [];
  try {
    if (!ratingId) throw new Error('ratingId is required');

    const upload = await api.uploadRatingPhotosAsync(ratingId, localPhotoUris, input.mediaDeps || deps);
    if (!upload.success) {
      return {
        success: false,
        error: upload.error || 'Photo upload failed',
        ratingId,
        mediaPaths: upload.paths || [],
      };
    }
    mediaPaths = upload.paths || [];

    const createdAt = input.createdAt || api.serverTimestamp();
    const { rating, post } = buildRatingCreation({
      ratingId,
      user: input.user,
      profile: input.profile,
      venue: input.venue,
      sentiment: input.sentiment,
      notes: input.notes,
      mediaPaths,
      visibility: input.visibility || 'public',
      createdAt,
    });

    const batch = api.writeBatch(api.db);
    batch.set(ratingRef, rating);
    if (post) batch.set(api.postRefForRating(ratingId), post);
    await batch.commit();

    return {
      success: true,
      ratingId,
      mediaPaths,
      postCreated: Boolean(post),
    };
  } catch (error) {
    if (mediaPaths.length > 0 && api.deleteStoragePathsAsync) {
      try {
        await api.deleteStoragePathsAsync(mediaPaths);
      } catch (_) {
        // Best-effort cleanup only. Orphaned media is preferable to broken public docs.
      }
    }
    return {
      success: false,
      error: normalizeError(error),
      ratingId,
      mediaPaths,
    };
  }
}

module.exports = {
  createRatingWithProjectionAsync,
  withDefaultDeps,
};
