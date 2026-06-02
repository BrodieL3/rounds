const {
  getMediaReferences,
  resolveMediaReferencesAsync,
} = require('../media-display');

describe('media display helpers', () => {
  test('prefers canonical mediaPaths and falls back to legacy URL fields', () => {
    expect(getMediaReferences({ mediaPaths: ['ratings/r1/photo.jpg'], mediaUrls: ['https://old'] })).toEqual(['ratings/r1/photo.jpg']);
    expect(getMediaReferences({ mediaUrls: ['https://cdn.test/a.jpg'] })).toEqual(['https://cdn.test/a.jpg']);
    expect(getMediaReferences({ photoURLs: ['https://cdn.test/b.jpg'] })).toEqual(['https://cdn.test/b.jpg']);
  });

  test('resolves Storage paths to transient URLs without rewriting Firestore data', async () => {
    const refs = [];
    const urls = await resolveMediaReferencesAsync([
      'ratings/r1/photo_1_0.jpg',
      'https://cdn.test/legacy.jpg',
    ], {
      storage: 'storage',
      ref: (storage, path) => {
        refs.push({ storage, path });
        return { storage, path };
      },
      getDownloadURL: async (storageRef) => `https://resolved.test/${storageRef.path}`,
    });

    expect(urls).toEqual([
      'https://resolved.test/ratings/r1/photo_1_0.jpg',
      'https://cdn.test/legacy.jpg',
    ]);
    expect(refs).toEqual([{ storage: 'storage', path: 'ratings/r1/photo_1_0.jpg' }]);
  });
});
