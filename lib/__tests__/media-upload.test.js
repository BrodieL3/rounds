const {
  getProfilePicturePath,
  getReviewPhotoPath,
  createReviewWithMediaAsync,
  uploadImageAsync,
  uploadReviewPhotosAsync,
} = require('../media-upload');

describe('media upload service', () => {
  test('uses stable Firebase Storage paths for profiles and review photos', () => {
    expect(getProfilePicturePath('user-123')).toBe('users/user-123/profile_pic.jpg');
    expect(getReviewPhotoPath('review-abc', 1700000000000, 2)).toBe('reviews/review-abc/photo_1700000000000_2.jpg');
  });

  test('uploads a local image URI and returns its download URL', async () => {
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

  test('compresses oversized review images before uploading and writing media URLs', async () => {
    const uploads = [];
    const writes = [];
    const sizes = {
      'file:///huge.jpg': 900 * 1024,
      'file:///compressed.jpg': 420 * 1024,
    };

    const result = await uploadReviewPhotosAsync('review-1', ['file:///huge.jpg'], {
      now: () => 1700000000000,
      fetch: async (uri) => ({ ok: true, blob: async () => ({ uri, size: sizes[uri] }) }),
      ImageManipulator: {
        SaveFormat: { JPEG: 'jpeg' },
        manipulateAsync: async () => ({ uri: 'file:///compressed.jpg' }),
      },
      storage: 'storage',
      db: 'db',
      ref: (storage, path) => ({ storage, path }),
      uploadBytes: async (storageRef, blob) => uploads.push({ storageRef, blob }),
      getDownloadURL: async (storageRef) => `https://cdn.test/${storageRef.path}`,
      doc: (db, collectionName, id) => ({ db, collectionName, id }),
      setDoc: async (docRef, payload, options) => writes.push({ docRef, payload, options }),
      serverTimestamp: () => 'SERVER_TIME',
    });

    expect(result.success).toBe(true);
    expect(uploads[0].blob.uri).toBe('file:///compressed.jpg');
    expect(writes[0].payload.mediaUrls).toEqual(result.urls);
  });

  test('creates a text-only review without a second media update write', async () => {
    const writes = [];
    const result = await createReviewWithMediaAsync({ userId: 'u1', description: 'Solid' }, [], {
      db: 'db',
      storage: 'storage',
      addDoc: async (collectionRef, payload) => {
        writes.push({ collectionRef, payload });
        return { id: 'review-text-only' };
      },
      collection: (db, collectionName) => ({ db, collectionName }),
      doc: (db, collectionName, id) => ({ db, collectionName, id }),
      setDoc: async () => {
        throw new Error('setDoc should not run without media');
      },
      serverTimestamp: () => 'SERVER_TIME',
    });

    expect(result).toEqual({
      success: true,
      reviewId: 'review-text-only',
      urls: [],
      paths: [],
    });
    expect(writes).toHaveLength(1);
    expect(writes[0].collectionRef).toEqual({ db: 'db', collectionName: 'reviews' });
  });

  test('stores resolved review media URLs on the review document', async () => {
    const writes = [];
    const result = await uploadReviewPhotosAsync('review-1', ['file:///a.jpg', 'file:///b.jpg'], {
      now: () => 1700000000000,
      fetch: async (uri) => ({ ok: true, blob: async () => ({ uri }) }),
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
    expect(result.urls).toEqual([
      'https://cdn.test/reviews/review-1/photo_1700000000000_0.jpg',
      'https://cdn.test/reviews/review-1/photo_1700000000000_1.jpg',
    ]);
    expect(writes).toEqual([
      {
        docRef: { db: 'db', collectionName: 'reviews', id: 'review-1' },
        payload: { mediaUrls: result.urls, updatedAt: 'SERVER_TIME' },
        options: { merge: true },
      },
    ]);
  });
});
