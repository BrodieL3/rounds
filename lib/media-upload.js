const MAX_REVIEW_IMAGE_BYTES = 500 * 1024;

const PROFILE_IMAGE_PICKER_OPTIONS = {
  mediaTypes: 'images',
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.7,
};

const REVIEW_IMAGE_PICKER_OPTIONS = {
  mediaTypes: 'images',
  allowsMultipleSelection: true,
  selectionLimit: 6,
  quality: 0.55,
};

function getProfilePicturePath(userId) {
  if (!userId) throw new Error('userId is required');
  return `users/${userId}/profile_pic.jpg`;
}

function getRatingPhotoPath(ratingId, timestamp, index) {
  if (!ratingId) throw new Error('ratingId is required');
  return `ratings/${ratingId}/photo_${timestamp}_${index}.jpg`;
}

function getReviewPhotoPath(reviewId, timestamp, index) {
  if (!reviewId) throw new Error('reviewId is required');
  return `reviews/${reviewId}/photo_${timestamp}_${index}.jpg`;
}

function getFirebaseDeps(deps = {}) {
  const storageApi = deps.ref && deps.uploadBytes && deps.getDownloadURL
    ? {}
    : require('firebase/storage');
  const firestoreApi = deps.doc && deps.setDoc && deps.serverTimestamp
    ? {}
    : require('firebase/firestore');
  const firebase = deps.storage && deps.db
    ? {}
    : require('./firebase');

  return {
    fetch: deps.fetch || fetch,
    storage: deps.storage || firebase.storage,
    db: deps.db || firebase.db,
    ref: deps.ref || storageApi.ref,
    uploadBytes: deps.uploadBytes || storageApi.uploadBytes,
    getDownloadURL: deps.getDownloadURL || storageApi.getDownloadURL,
    doc: deps.doc || firestoreApi.doc,
    setDoc: deps.setDoc || firestoreApi.setDoc,
    serverTimestamp: deps.serverTimestamp || firestoreApi.serverTimestamp,
    now: deps.now || Date.now,
  };
}

function getUploadDeps(deps = {}) {
  const storageApi = deps.ref && deps.uploadBytes && deps.getDownloadURL
    ? {}
    : require('firebase/storage');
  const firebase = deps.storage ? {} : require('./firebase');

  return {
    fetch: deps.fetch || fetch,
    storage: deps.storage || firebase.storage,
    ref: deps.ref || storageApi.ref,
    uploadBytes: deps.uploadBytes || storageApi.uploadBytes,
    getDownloadURL: deps.getDownloadURL || storageApi.getDownloadURL,
  };
}

function getPathUploadDeps(deps = {}) {
  const storageApi = deps.ref && deps.uploadBytes ? {} : require('firebase/storage');
  const firebase = deps.storage ? {} : require('./firebase');

  return {
    fetch: deps.fetch || fetch,
    storage: deps.storage || firebase.storage,
    ref: deps.ref || storageApi.ref,
    uploadBytes: deps.uploadBytes || storageApi.uploadBytes,
  };
}

function normalizeUploadError(error) {
  return error?.message || String(error) || 'Upload failed';
}

async function getImageBlobAsync(localUri, fetchImpl) {
  const response = await fetchImpl(localUri);
  if (response?.ok === false) throw new Error(`Unable to read local file: ${localUri}`);
  return response.blob();
}

function getImageManipulator(deps = {}) {
  return deps.ImageManipulator || require('expo-image-manipulator');
}

async function compressImageToMaxBytesAsync(localUri, deps = {}) {
  const maxBytes = deps.maxBytes || MAX_REVIEW_IMAGE_BYTES;
  const fetchImpl = deps.fetch || fetch;
  const originalBlob = await getImageBlobAsync(localUri, fetchImpl);
  if (!originalBlob.size || originalBlob.size <= maxBytes) {
    return { success: true, uri: localUri, size: originalBlob.size || null, compressed: false };
  }

  const ImageManipulator = getImageManipulator(deps);
  const attempts = deps.compressionAttempts || [
    { width: 1600, compress: 0.7 },
    { width: 1280, compress: 0.6 },
    { width: 1080, compress: 0.52 },
    { width: 900, compress: 0.45 },
    { width: 720, compress: 0.38 },
    { width: 600, compress: 0.32 },
  ];

  let best = { uri: localUri, size: originalBlob.size };
  for (const attempt of attempts) {
    const result = await ImageManipulator.manipulateAsync(
      localUri,
      [{ resize: { width: attempt.width } }],
      { compress: attempt.compress, format: ImageManipulator.SaveFormat?.JPEG || 'jpeg' }
    );
    const blob = await getImageBlobAsync(result.uri, fetchImpl);
    if (!best.size || (blob.size && blob.size < best.size)) best = { uri: result.uri, size: blob.size };
    if (!blob.size || blob.size <= maxBytes) {
      return { success: true, uri: result.uri, size: blob.size || null, compressed: true };
    }
  }

  return {
    success: false,
    uri: best.uri,
    size: best.size,
    error: `Image is too large after compression. Pick or crop an image under ${Math.round(maxBytes / 1024)}KB.`,
  };
}

async function uploadImageAsync(localUri, storagePath, deps = {}) {
  if (!localUri) return { success: false, error: 'localUri is required' };
  if (!storagePath) return { success: false, error: 'storagePath is required' };

  const api = getUploadDeps(deps);

  try {
    const blob = await getImageBlobAsync(localUri, api.fetch);
    if (deps.maxBytes && blob.size && blob.size > deps.maxBytes) {
      throw new Error(`Image is too large. Pick or crop an image under ${Math.round(deps.maxBytes / 1024)}KB.`);
    }

    const storageRef = api.ref(api.storage, storagePath);
    await api.uploadBytes(storageRef, blob, {
      contentType: 'image/jpeg',
      cacheControl: 'public,max-age=31536000',
    });
    const url = await api.getDownloadURL(storageRef);

    return { success: true, url, urls: [url], path: storagePath };
  } catch (error) {
    return { success: false, error: normalizeUploadError(error), path: storagePath };
  }
}

async function uploadImagePathAsync(localUri, storagePath, deps = {}) {
  if (!localUri) return { success: false, error: 'localUri is required' };
  if (!storagePath) return { success: false, error: 'storagePath is required' };

  const api = getPathUploadDeps(deps);

  try {
    const blob = await getImageBlobAsync(localUri, api.fetch);
    if (deps.maxBytes && blob.size && blob.size > deps.maxBytes) {
      throw new Error(`Image is too large. Pick or crop an image under ${Math.round(deps.maxBytes / 1024)}KB.`);
    }

    const storageRef = api.ref(api.storage, storagePath);
    await api.uploadBytes(storageRef, blob, {
      contentType: 'image/jpeg',
      cacheControl: 'public,max-age=31536000',
    });

    return { success: true, path: storagePath };
  } catch (error) {
    return { success: false, error: normalizeUploadError(error), path: storagePath };
  }
}

async function uploadProfilePictureAsync(userId, localUri, deps = {}) {
  let storagePath;
  try {
    storagePath = getProfilePicturePath(userId);
  } catch (error) {
    return { success: false, error: normalizeUploadError(error) };
  }

  const maxBytes = deps.maxBytes || MAX_REVIEW_IMAGE_BYTES;
  const prepared = await compressImageToMaxBytesAsync(localUri, { ...deps, maxBytes });
  if (!prepared.success) return { success: false, error: prepared.error, path: storagePath };

  const upload = await uploadImageAsync(prepared.uri, storagePath, { ...deps, maxBytes });
  if (!upload.success) return upload;

  const api = getFirebaseDeps(deps);
  try {
    await api.setDoc(
      api.doc(api.db, 'users', userId),
      { photoURL: upload.url, updatedAt: api.serverTimestamp() },
      { merge: true }
    );

    return upload;
  } catch (error) {
    return {
      success: false,
      error: normalizeUploadError(error),
      url: upload.url,
      urls: upload.urls,
      path: upload.path,
    };
  }
}

async function uploadRatingPhotosAsync(ratingId, localUris = [], deps = {}) {
  if (!ratingId) return { success: false, error: 'ratingId is required', paths: [] };
  if (!Array.isArray(localUris)) return { success: false, error: 'localUris must be an array', paths: [] };

  const timestamp = (deps.now || Date.now)();
  const paths = [];

  try {
    for (let index = 0; index < localUris.length; index += 1) {
      const path = getRatingPhotoPath(ratingId, timestamp, index);
      const prepared = await compressImageToMaxBytesAsync(localUris[index], {
        ...deps,
        maxBytes: deps.maxBytes || MAX_REVIEW_IMAGE_BYTES,
      });
      if (!prepared.success) {
        return {
          success: false,
          error: prepared.error,
          paths,
          failedIndex: index,
        };
      }

      const upload = await uploadImagePathAsync(prepared.uri, path, {
        ...deps,
        maxBytes: deps.maxBytes || MAX_REVIEW_IMAGE_BYTES,
      });
      if (!upload.success) {
        return {
          success: false,
          error: upload.error,
          paths,
          failedIndex: index,
        };
      }
      paths.push(path);
    }

    return { success: true, paths };
  } catch (error) {
    return { success: false, error: normalizeUploadError(error), paths };
  }
}

async function pickProfileImageAsync(deps = {}) {
  const ImagePicker = deps.ImagePicker || require('expo-image-picker');
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (permission.status !== 'granted') return { success: false, error: 'Photo library permission denied' };

  const result = await ImagePicker.launchImageLibraryAsync(PROFILE_IMAGE_PICKER_OPTIONS);
  if (result.canceled || !result.assets?.[0]) return { success: false, canceled: true };

  return { success: true, asset: result.assets[0], uri: result.assets[0].uri };
}

async function pickReviewImagesAsync(deps = {}) {
  const ImagePicker = deps.ImagePicker || require('expo-image-picker');
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (permission.status !== 'granted') return { success: false, error: 'Photo library permission denied' };

  const result = await ImagePicker.launchImageLibraryAsync(REVIEW_IMAGE_PICKER_OPTIONS);
  if (result.canceled || !result.assets?.length) return { success: false, canceled: true, assets: [] };

  const oversized = result.assets.filter((asset) => asset.fileSize && asset.fileSize > MAX_REVIEW_IMAGE_BYTES);
  return {
    success: true,
    assets: result.assets,
    uris: result.assets.map((asset) => asset.uri),
    warning: oversized.length
      ? 'Some photos are large. Rounds will compress them before upload.'
      : null,
  };
}

module.exports = {
  MAX_REVIEW_IMAGE_BYTES,
  PROFILE_IMAGE_PICKER_OPTIONS,
  REVIEW_IMAGE_PICKER_OPTIONS,
  compressImageToMaxBytesAsync,
  getProfilePicturePath,
  getRatingPhotoPath,
  getReviewPhotoPath,
  pickProfileImageAsync,
  pickReviewImagesAsync,
  uploadImageAsync,
  uploadImagePathAsync,
  uploadProfilePictureAsync,
  uploadRatingPhotosAsync,
};
