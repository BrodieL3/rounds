function isResolvedUri(value) {
  return typeof value === 'string'
    && (/^https?:\/\//.test(value) || /^file:/.test(value) || /^data:/.test(value));
}

function asArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function getMediaReferences(item = {}) {
  const canonical = asArray(item.mediaPaths);
  if (canonical.length > 0) return canonical;

  const mediaUrls = asArray(item.mediaUrls);
  if (mediaUrls.length > 0) return mediaUrls;

  const photoURLs = asArray(item.photoURLs);
  if (photoURLs.length > 0) return photoURLs;

  const photos = asArray(item.photos);
  if (photos.length > 0) return photos;

  return asArray(item.media);
}

function getStorageDeps(deps = {}) {
  if (deps.ref && deps.getDownloadURL && deps.storage) return deps;
  const storageApi = require('firebase/storage');
  const firebase = require('./firebase');
  return {
    storage: deps.storage || firebase.storage,
    ref: deps.ref || storageApi.ref,
    getDownloadURL: deps.getDownloadURL || storageApi.getDownloadURL,
  };
}

async function resolveMediaReferencesAsync(references = [], deps = {}) {
  const values = asArray(references);
  if (values.length === 0) return [];

  const api = getStorageDeps(deps);
  return Promise.all(values.map(async (value) => {
    if (isResolvedUri(value)) return value;
    const storageRef = api.ref(api.storage, value);
    return api.getDownloadURL(storageRef);
  }));
}

module.exports = {
  getMediaReferences,
  isResolvedUri,
  resolveMediaReferencesAsync,
};
