const {
  getProfilePicturePath,
  getRatingPhotoPath,
  getReviewPhotoPath,
  uploadImageAsync,
  uploadProfilePictureAsync,
  uploadRatingPhotosAsync,
} = require('../media-upload');

describe('media upload service', () => {
  test('uses stable Firebase Storage paths for profiles, canonical Rating photos, and legacy review photos', () => {
    expect(getProfilePicturePath('user-123')).toBe('users/user-123/profile_pic.jpg');
    expect(getRatingPhotoPath('rating-abc', 1700000000000, 2)).toBe('ratings/rating-abc/photo_1700000000000_2.jpg');
    expect(getReviewPhotoPath('review-abc', 1700000000000, 2)).toBe('reviews/review-abc/photo_1700000000000_2.jpg');
  });

  test('uploads a local image URI and returns its download URL for profile photos', async () => {
    const calls = [];
    const result = await uploadImageAsync('file:///tmp/pic.jpg', 'users/u1/profile_pic.jpg', {
      fetch: async (uri) => ({
        ok: true,
        blob: async () => ({ uri, type: 'image/jpeg' }),
      }),
      storage: 'storage',
      ref: (storage, path) => ({ storage, path }),
      uploadBytes: async (storageRef, blob, metadata) => calls.push({ storageRef, blob, metadata }),
      getDownloadURL: async (storageRef) => `https://cdn.test/${storageRef.path}`,
    });

    expect(result).toEqual({
      success: true,
      url: 'https://cdn.test/users/u1/profile_pic.jpg',
      urls: ['https://cdn.test/users/u1/profile_pic.jpg'],
      path: 'users/u1/profile_pic.jpg',
    });
    expect(calls[0].storageRef.path).toBe('users/u1/profile_pic.jpg');
    expect(calls[0].metadata.contentType).toBe('image/jpeg');
  });

  test('compresses oversized Rating images and returns only canonical Storage paths', async () => {
    const uploads = [];
    const writes = [];
    const sizes = {
      'file:///huge.jpg': 900 * 1024,
      'file:///compressed.jpg': 420 * 1024,
    };

    const result = await uploadRatingPhotosAsync('rating-1', ['file:///huge.jpg'], {
      now: () => 1700000000000,
      fetch: async (uri) => ({ ok: true, blob: async () => ({ uri, size: sizes[uri] }) }),
      ImageManipulator: {
        SaveFormat: { JPEG: 'jpeg' },
        manipulateAsync: async () => ({ uri: 'file:///compressed.jpg' }),
      },
      storage: 'storage',
      ref: (storage, path) => ({ storage, path }),
      uploadBytes: async (storageRef, blob) => uploads.push({ storageRef, blob }),
      getDownloadURL: async () => {
        throw new Error('Rating uploads must not resolve download URLs');
      },
      doc: () => {
        throw new Error('Rating uploads must not write Firestore docs');
      },
      setDoc: async (docRef, payload, options) => writes.push({ docRef, payload, options }),
    });

    expect(result).toEqual({
      success: true,
      paths: ['ratings/rating-1/photo_1700000000000_0.jpg'],
    });
    expect(uploads[0].blob.uri).toBe('file:///compressed.jpg');
    expect(writes).toEqual([]);
  });

  test('aborts Rating photo uploads before writing docs when one upload fails', async () => {
    const uploads = [];
    const result = await uploadRatingPhotosAsync('rating-1', ['file:///a.jpg', 'file:///b.jpg'], {
      now: () => 1700000000000,
      fetch: async (uri) => ({ ok: true, blob: async () => ({ uri, size: 100 }) }),
      storage: 'storage',
      ref: (storage, path) => ({ storage, path }),
      uploadBytes: async (storageRef) => {
        uploads.push(storageRef.path);
        if (storageRef.path.endsWith('_1.jpg')) throw new Error('upload failed');
      },
      getDownloadURL: async () => {
        throw new Error('Rating uploads must not resolve download URLs');
      },
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('upload failed');
    expect(result.paths).toEqual(['ratings/rating-1/photo_1700000000000_0.jpg']);
    expect(result.failedIndex).toBe(1);
  });

  test('profile upload still stores a resolved profile URL on the user document', async () => {
    const writes = [];
    const result = await uploadProfilePictureAsync('u1', 'file:///profile.jpg', {
      fetch: async (uri) => ({ ok: true, blob: async () => ({ uri, size: 100 }) }),
      storage: 'storage',
      db: 'db',
      ref: (storage, path) => ({ storage, path }),
      uploadBytes: async () => {},
      getDownloadURL: async (storageRef) => `https://cdn.test/${storageRef.path}`,
      doc: (db, collectionName, id) => ({ db, collectionName, id }),
      setDoc: async (docRef, payload, options) => writes.push({ docRef, payload, options }),
      serverTimestamp: () => 'SERVER_TIME',
    });

    expect(result.success).toBe(true);
    expect(writes).toEqual([
      {
        docRef: { db: 'db', collectionName: 'users', id: 'u1' },
        payload: { photoURL: 'https://cdn.test/users/u1/profile_pic.jpg', updatedAt: 'SERVER_TIME' },
        options: { merge: true },
      },
    ]);
  });
});
