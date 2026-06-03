const {
  compressImageToMaxBytesAsync,
  uploadImagePathAsync,
} = require('../media-upload');
const {
  buildDirectMessageWrites,
  buildGroupMessageWrites,
  executeDirectMessageSend,
  executeGroupMessageSend,
} = require('./message-send-service');

const MAX_CHAT_PHOTOS = 10;
const MAX_PHOTO_BYTES = 500 * 1024;

const CHAT_PHOTO_PICKER_OPTIONS = {
  mediaTypes: 'images',
  allowsMultipleSelection: true,
  selectionLimit: MAX_CHAT_PHOTOS,
  quality: 0.55,
};

function defaultFirestoreApi() {
  return require('firebase/firestore');
}

function defaultStorageApi() {
  return require('firebase/storage');
}

function nowValue(api) {
  return api && typeof api.serverTimestamp === 'function' ? api.serverTimestamp() : new Date();
}

function requiredString(value, fieldName) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) throw new Error(`${fieldName} is required`);
  return normalized;
}

function getChatPhotoPath(conversationId, timestamp, index) {
  if (!conversationId) throw new Error('conversationId is required');
  return `conversations/${conversationId}/photos/photo_${timestamp}_${index}.jpg`;
}

function buildPhotoMessagePayload({ senderUid, mediaPaths, aspectRatios, createdAt }) {
  const uid = requiredString(senderUid, 'senderUid');
  if (!Array.isArray(mediaPaths) || mediaPaths.length === 0) {
    throw new Error('mediaPaths must be a non-empty array');
  }
  if (mediaPaths.length > MAX_CHAT_PHOTOS) {
    throw new Error(`mediaPaths must contain ${MAX_CHAT_PHOTOS} photos or fewer`);
  }
  if (!Array.isArray(aspectRatios) || aspectRatios.length !== mediaPaths.length) {
    throw new Error('aspectRatios must be an array matching mediaPaths length');
  }

  return {
    senderUid: uid,
    type: 'photo',
    mediaPaths,
    aspectRatios,
    createdAt,
    deletedForEveryoneAt: null,
  };
}

function buildPhotoLastMessage({ messageId, senderUid, photoCount, createdAt }) {
  return {
    id: messageId,
    senderUid,
    type: 'photo',
    photoCount,
    createdAt,
  };
}

function buildDirectPhotoMessageWrites({
  senderUid,
  recipientUid,
  mediaPaths,
  aspectRatios,
  messageId,
  createdAt,
  isFirstMessage,
}) {
  const message = buildPhotoMessagePayload({ senderUid, mediaPaths, aspectRatios, createdAt });
  const lastMessage = buildPhotoLastMessage({
    messageId,
    senderUid,
    photoCount: mediaPaths.length,
    createdAt,
  });

  return buildDirectMessageWrites({
    senderUid,
    recipientUid,
    message,
    lastMessage,
    messageId,
    createdAt,
    isFirstMessage,
  });
}

function buildGroupPhotoMessageWrites({
  conversationId,
  memberUids = [],
  senderUid,
  mediaPaths,
  aspectRatios,
  messageId,
  createdAt,
}) {
  const message = buildPhotoMessagePayload({ senderUid, mediaPaths, aspectRatios, createdAt });
  const lastMessage = buildPhotoLastMessage({
    messageId,
    senderUid,
    photoCount: mediaPaths.length,
    createdAt,
  });

  return buildGroupMessageWrites({
    conversationId,
    memberUids,
    senderUid,
    message,
    lastMessage,
    messageId,
    createdAt,
  });
}

async function uploadChatPhotosAsync(conversationId, photos, deps = {}) {
  if (!conversationId) return { success: false, error: 'conversationId is required', paths: [], aspectRatios: [] };
  if (!Array.isArray(photos)) return { success: false, error: 'photos must be an array', paths: [], aspectRatios: [] };

  const timestamp = (deps.now || Date.now)();
  const paths = [];
  const aspectRatios = [];

  try {
    for (let index = 0; index < photos.length; index++) {
      const photo = photos[index];
      const path = getChatPhotoPath(conversationId, timestamp, index);

      const compressFn = deps.compressImage || compressImageToMaxBytesAsync;
      const compressed = await compressFn(photo.uri, { ...deps, maxBytes: deps.maxBytes || MAX_PHOTO_BYTES });
      if (!compressed.success) {
        return {
          success: false,
          error: compressed.error,
          paths,
          aspectRatios,
          failedIndex: index,
        };
      }

      const uploadFn = deps.uploadImagePath || uploadImagePathAsync;
      const upload = await uploadFn(compressed.uri, path, { ...deps, maxBytes: deps.maxBytes || MAX_PHOTO_BYTES });
      if (!upload.success) {
        return {
          success: false,
          error: upload.error,
          paths,
          aspectRatios,
          failedIndex: index,
        };
      }

      paths.push(path);
      aspectRatios.push(photo.aspectRatio || 1);
    }

    return { success: true, paths, aspectRatios };
  } catch (error) {
    return {
      success: false,
      error: error?.message || String(error) || 'Upload failed',
      paths,
      aspectRatios,
    };
  }
}

async function deleteChatPhotoPathsAsync(paths, deps = {}) {
  const storageApi = deps.storageApi || defaultStorageApi();
  const storage = deps.storage || require('../firebase').storage;
  await Promise.all(paths.map((path) => {
    try {
      return storageApi.deleteObject(storageApi.ref(storage, path));
    } catch (_) {
      return null;
    }
  }));
}

async function sendDirectPhotoMessage({ db, senderUid, recipientUid, photos }, deps = {}) {
  const api = deps.firestoreApi || defaultFirestoreApi();
  let uploadRef = null;

  const adapter = {
    async prepare({ conversationId, messageId, createdAt }) {
      const upload = await uploadChatPhotosAsync(conversationId, photos, deps);
      if (!upload.success) return upload;
      uploadRef = upload;
      return { success: true, context: upload };
    },
    buildPayload({ messageId, createdAt, context }) {
      const message = buildPhotoMessagePayload({
        senderUid,
        mediaPaths: context.paths,
        aspectRatios: context.aspectRatios,
        createdAt,
      });
      const lastMessage = buildPhotoLastMessage({
        messageId,
        senderUid,
        photoCount: context.paths.length,
        createdAt,
      });
      return { message, lastMessage };
    },
    async cleanup(context) {
      if (context?.paths?.length > 0) {
        await deleteChatPhotoPathsAsync(context.paths, deps);
      }
    },
  };

  const result = await executeDirectMessageSend({
    db,
    senderUid,
    recipientUid,
    messageAdapter: adapter,
    api,
  });

  if (!result.success) {
    return { success: false, error: result.error, conversationId: result.conversationId, mediaPaths: uploadRef?.paths || [] };
  }
  return { success: true, conversationId: result.conversationId, messageId: result.messageId, mediaPaths: result.context.paths };
}

async function sendGroupPhotoMessage({ db, conversation, senderUid, photos }, deps = {}) {
  const api = deps.firestoreApi || defaultFirestoreApi();
  let uploadRef = null;

  const adapter = {
    async prepare({ conversationId, messageId, createdAt }) {
      const upload = await uploadChatPhotosAsync(conversationId, photos, deps);
      if (!upload.success) return upload;
      uploadRef = upload;
      return { success: true, context: upload };
    },
    buildPayload({ messageId, createdAt, context }) {
      const message = buildPhotoMessagePayload({
        senderUid,
        mediaPaths: context.paths,
        aspectRatios: context.aspectRatios,
        createdAt,
      });
      const lastMessage = buildPhotoLastMessage({
        messageId,
        senderUid,
        photoCount: context.paths.length,
        createdAt,
      });
      return { message, lastMessage };
    },
    async cleanup(context) {
      if (context?.paths?.length > 0) {
        await deleteChatPhotoPathsAsync(context.paths, deps);
      }
    },
  };

  const result = await executeGroupMessageSend({
    db,
    conversation,
    senderUid,
    messageAdapter: adapter,
    api,
  });

  if (!result.success) {
    return { success: false, error: result.error, conversationId: result.conversationId, mediaPaths: uploadRef?.paths || [] };
  }
  return { success: true, conversationId: result.conversationId, messageId: result.messageId, mediaPaths: result.context.paths };
}

async function pickChatPhotosAsync(deps = {}) {
  const ImagePicker = deps.ImagePicker || require('expo-image-picker');
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (permission.status !== 'granted') {
    return { success: false, error: 'Photo library permission denied' };
  }

  const result = await ImagePicker.launchImageLibraryAsync(CHAT_PHOTO_PICKER_OPTIONS);
  if (result.canceled || !result.assets?.length) {
    return { success: false, canceled: true, assets: [], uris: [], aspectRatios: [] };
  }

  const assets = result.assets;
  const uris = assets.map((asset) => asset.uri);
  const aspectRatios = assets.map((asset) => {
    if (asset.width && asset.height && asset.height > 0) {
      return asset.width / asset.height;
    }
    return 1;
  });

  return {
    success: true,
    assets,
    uris,
    aspectRatios,
  };
}

module.exports = {
  MAX_CHAT_PHOTOS,
  MAX_PHOTO_BYTES,
  buildDirectPhotoMessageWrites,
  buildGroupPhotoMessageWrites,
  buildPhotoMessagePayload,
  deleteChatPhotoPathsAsync,
  getChatPhotoPath,
  pickChatPhotosAsync,
  sendDirectPhotoMessage,
  sendGroupPhotoMessage,
  uploadChatPhotosAsync,
};
module.exports.__esModule = true;
