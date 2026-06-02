const {
  buildDirectPhotoMessageWrites,
  buildGroupPhotoMessageWrites,
  buildPhotoMessagePayload,
  getChatPhotoPath,
  pickChatPhotosAsync,
  uploadChatPhotosAsync,
} = require('../friends/photo-service');

describe('Friends photo message service contracts', () => {
  test('builds photo message payload with paths and aspect ratios', () => {
    expect(buildPhotoMessagePayload({
      senderUid: 'alice',
      mediaPaths: ['conversations/c1/photos/photo_1_0.jpg'],
      aspectRatios: [1.5],
      createdAt: 10,
    })).toEqual({
      senderUid: 'alice',
      type: 'photo',
      mediaPaths: ['conversations/c1/photos/photo_1_0.jpg'],
      aspectRatios: [1.5],
      createdAt: 10,
      deletedForEveryoneAt: null,
    });

    expect(buildPhotoMessagePayload({
      senderUid: 'alice',
      mediaPaths: ['a.jpg', 'b.jpg'],
      aspectRatios: [1.0, 0.75],
      createdAt: 10,
    })).toEqual({
      senderUid: 'alice',
      type: 'photo',
      mediaPaths: ['a.jpg', 'b.jpg'],
      aspectRatios: [1.0, 0.75],
      createdAt: 10,
      deletedForEveryoneAt: null,
    });
  });

  test('rejects invalid photo payloads', () => {
    expect(() => buildPhotoMessagePayload({})).toThrow('senderUid');
    expect(() => buildPhotoMessagePayload({ senderUid: 'a', mediaPaths: [] })).toThrow('non-empty');
    expect(() => buildPhotoMessagePayload({
      senderUid: 'a',
      mediaPaths: Array.from({ length: 11 }, (_, i) => `p${i}.jpg`),
      aspectRatios: Array.from({ length: 11 }, () => 1.0),
    })).toThrow('10');
    expect(() => buildPhotoMessagePayload({
      senderUid: 'a',
      mediaPaths: ['a.jpg', 'b.jpg'],
      aspectRatios: [1.0],
    })).toThrow('matching');
  });

  test('computes chat photo storage path', () => {
    expect(getChatPhotoPath('c1', 12345, 0)).toBe('conversations/c1/photos/photo_12345_0.jpg');
    expect(getChatPhotoPath('c1', 12345, 3)).toBe('conversations/c1/photos/photo_12345_3.jpg');
  });

  test('builds first DM photo message writes', () => {
    const writes = buildDirectPhotoMessageWrites({
      senderUid: 'alice',
      recipientUid: 'bob',
      mediaPaths: ['conversations/dm_alice_bob/photos/photo_1_0.jpg'],
      aspectRatios: [1.5],
      messageId: 'm1',
      createdAt: 10,
      isFirstMessage: true,
    });

    expect(writes.conversationId).toBe('dm_alice_bob');
    expect(writes.conversation).toEqual({
      type: 'dm',
      memberUids: ['alice', 'bob'],
      createdAt: 10,
      createdByUid: 'alice',
      lastMessageAt: 10,
      lastMessage: {
        id: 'm1',
        senderUid: 'alice',
        type: 'photo',
        photoCount: 1,
        createdAt: 10,
      },
    });
    expect(writes.members).toEqual({
      alice: { uid: 'alice', role: 'member', joinedAt: 10, leftAt: null },
      bob: { uid: 'bob', role: 'member', joinedAt: 10, leftAt: null },
    });
    expect(writes.message).toEqual({
      senderUid: 'alice',
      type: 'photo',
      mediaPaths: ['conversations/dm_alice_bob/photos/photo_1_0.jpg'],
      aspectRatios: [1.5],
      createdAt: 10,
      deletedForEveryoneAt: null,
    });
    expect(writes.senderState).toEqual({ hiddenAt: null, lastSeenAt: 10 });
    expect(writes.recipientState).toEqual({ hiddenAt: null });
    expect(writes.recipientNotification).toEqual({
      type: 'new_direct_message',
      actorUid: 'alice',
      conversationId: 'dm_alice_bob',
      createdAt: 10,
    });
  });

  test('builds subsequent DM photo message writes without members', () => {
    const writes = buildDirectPhotoMessageWrites({
      senderUid: 'bob',
      recipientUid: 'alice',
      mediaPaths: ['conversations/dm_alice_bob/photos/photo_2_0.jpg', 'conversations/dm_alice_bob/photos/photo_2_1.jpg'],
      aspectRatios: [1.0, 0.75],
      messageId: 'm2',
      createdAt: 20,
      isFirstMessage: false,
    });

    expect(writes.conversationId).toBe('dm_alice_bob');
    expect(writes.conversation).toEqual({
      lastMessageAt: 20,
      lastMessage: {
        id: 'm2',
        senderUid: 'bob',
        type: 'photo',
        photoCount: 2,
        createdAt: 20,
      },
    });
    expect(writes.members).toBe(null);
    expect(writes.senderState).toEqual({ hiddenAt: null, lastSeenAt: 20 });
    expect(writes.recipientState).toBe(null);
  });

  test('builds group photo message writes with notification fanout', () => {
    const writes = buildGroupPhotoMessageWrites({
      conversationId: 'group1',
      memberUids: ['alice', 'bob', 'cara'],
      senderUid: 'alice',
      mediaPaths: ['conversations/group1/photos/photo_1_0.jpg'],
      aspectRatios: [1.5],
      messageId: 'm1',
      createdAt: 10,
    });

    expect(writes.conversationUpdate).toEqual({
      lastMessageAt: 10,
      lastMessage: {
        id: 'm1',
        senderUid: 'alice',
        type: 'photo',
        photoCount: 1,
        createdAt: 10,
      },
    });
    expect(writes.message).toEqual({
      senderUid: 'alice',
      type: 'photo',
      mediaPaths: ['conversations/group1/photos/photo_1_0.jpg'],
      aspectRatios: [1.5],
      createdAt: 10,
      deletedForEveryoneAt: null,
    });
    expect(writes.senderState).toEqual({ hiddenAt: null, lastSeenAt: 10 });
    expect(writes.recipientNotifications).toEqual({
      bob: { type: 'new_group_message', actorUid: 'alice', conversationId: 'group1', createdAt: 10 },
      cara: { type: 'new_group_message', actorUid: 'alice', conversationId: 'group1', createdAt: 10 },
    });
  });
});

describe('Friends photo upload helper', () => {
  test('uploads photos and returns paths with aspect ratios', async () => {
    const uploadedPaths = [];
    const deps = {
      now: () => 12345,
      compressImage: async () => ({ success: true, uri: 'compressed.jpg' }),
      uploadImagePath: async (uri, path) => {
        uploadedPaths.push(path);
        return { success: true, path };
      },
    };

    const result = await uploadChatPhotosAsync('c1', [
      { uri: 'a.jpg', aspectRatio: 1.5 },
      { uri: 'b.jpg', aspectRatio: 0.75 },
    ], deps);

    expect(result.success).toBe(true);
    expect(result.paths).toEqual([
      'conversations/c1/photos/photo_12345_0.jpg',
      'conversations/c1/photos/photo_12345_1.jpg',
    ]);
    expect(result.aspectRatios).toEqual([1.5, 0.75]);
  });

  test('aborts on compression failure and returns partial paths', async () => {
    const deps = {
      now: () => 12345,
      compressImage: async (uri) => {
        if (uri === 'b.jpg') return { success: false, error: 'too big' };
        return { success: true, uri: 'compressed.jpg' };
      },
      uploadImagePath: async (uri, path) => ({ success: true, path }),
    };

    const result = await uploadChatPhotosAsync('c1', [
      { uri: 'a.jpg', aspectRatio: 1.0 },
      { uri: 'b.jpg', aspectRatio: 1.0 },
    ], deps);

    expect(result.success).toBe(false);
    expect(result.error).toBe('too big');
    expect(result.paths.length).toBe(1);
    expect(result.failedIndex).toBe(1);
  });

  test('aborts on upload failure and returns partial paths', async () => {
    const deps = {
      now: () => 12345,
      compressImage: async () => ({ success: true, uri: 'compressed.jpg' }),
      uploadImagePath: async (uri, path) => {
        if (path.includes('_1.jpg')) return { success: false, error: 'network' };
        return { success: true, path };
      },
    };

    const result = await uploadChatPhotosAsync('c1', [
      { uri: 'a.jpg', aspectRatio: 1.0 },
      { uri: 'b.jpg', aspectRatio: 1.0 },
    ], deps);

    expect(result.success).toBe(false);
    expect(result.error).toBe('network');
    expect(result.paths.length).toBe(1);
    expect(result.failedIndex).toBe(1);
  });
});

describe('Friends photo picker', () => {
  test('returns picked photos with aspect ratios', async () => {
    const deps = {
      ImagePicker: {
        requestMediaLibraryPermissionsAsync: async () => ({ status: 'granted' }),
        launchImageLibraryAsync: async () => ({
          canceled: false,
          assets: [
            { uri: 'a.jpg', width: 1200, height: 800 },
            { uri: 'b.jpg', width: 800, height: 1200 },
          ],
        }),
      },
    };

    const result = await pickChatPhotosAsync(deps);
    expect(result.success).toBe(true);
    expect(result.uris).toEqual(['a.jpg', 'b.jpg']);
    expect(result.aspectRatios).toEqual([1.5, 2 / 3]);
  });

  test('returns canceled state', async () => {
    const deps = {
      ImagePicker: {
        requestMediaLibraryPermissionsAsync: async () => ({ status: 'granted' }),
        launchImageLibraryAsync: async () => ({ canceled: true, assets: [] }),
      },
    };

    const result = await pickChatPhotosAsync(deps);
    expect(result.success).toBe(false);
    expect(result.canceled).toBe(true);
  });

  test('returns error on permission denied', async () => {
    const deps = {
      ImagePicker: {
        requestMediaLibraryPermissionsAsync: async () => ({ status: 'denied' }),
      },
    };

    const result = await pickChatPhotosAsync(deps);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/denied/i);
  });
});
