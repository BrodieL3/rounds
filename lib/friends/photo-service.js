const { buildDirectConversationId, getSortedPairUids } = require('./ids');
const {
  compressImageToMaxBytesAsync,
  uploadImagePathAsync,
} = require('../media-upload');

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
  const conversationId = buildDirectConversationId(senderUid, recipientUid);
  const memberUids = getSortedPairUids(senderUid, recipientUid);
  const payload = buildPhotoMessagePayload({ senderUid, mediaPaths, aspectRatios, createdAt });
  const lastMessage = buildPhotoLastMessage({
    messageId,
    senderUid,
    photoCount: mediaPaths.length,
    createdAt,
  });

  const conversation = isFirstMessage
    ? {
      type: 'dm',
      memberUids,
      createdAt,
      createdByUid: senderUid,
      lastMessageAt: createdAt,
      lastMessage,
    }
    : {
      lastMessageAt: createdAt,
      lastMessage,
    };

  return {
    conversationId,
    conversation,
    members: isFirstMessage
      ? {
        [memberUids[0]]: { uid: memberUids[0], role: 'member', joinedAt: createdAt, leftAt: null },
        [memberUids[1]]: { uid: memberUids[1], role: 'member', joinedAt: createdAt, leftAt: null },
      }
      : null,
    message: payload,
    senderState: { hiddenAt: null, lastSeenAt: createdAt },
    recipientState: isFirstMessage ? { hiddenAt: null } : null,
    recipientNotification: {
      type: 'new_direct_message',
      actorUid: senderUid,
      conversationId,
      createdAt,
    },
  };
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
  const payload = buildPhotoMessagePayload({ senderUid, mediaPaths, aspectRatios, createdAt });
  const lastMessage = buildPhotoLastMessage({
    messageId,
    senderUid,
    photoCount: mediaPaths.length,
    createdAt,
  });
  const recipientNotifications = memberUids
    .filter((uid) => uid !== senderUid)
    .reduce((notifications, uid) => ({
      ...notifications,
      [uid]: {
        type: 'new_group_message',
        actorUid: senderUid,
        conversationId,
        createdAt,
      },
    }), {});

  return {
    conversationUpdate: {
      lastMessageAt: createdAt,
      lastMessage,
    },
    message: payload,
    senderState: { hiddenAt: null, lastSeenAt: createdAt },
    recipientNotifications,
  };
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
  const conversationId = buildDirectConversationId(senderUid, recipientUid);
  const conversationRef = api.doc(db, 'conversations', conversationId);
  const messageRef = api.doc(api.collection(conversationRef, 'messages'));
  const createdAt = nowValue(api);

  const conversationSnap = await api.getDoc(conversationRef);
  const isFirstMessage = !conversationSnap.exists();

  const upload = await uploadChatPhotosAsync(conversationId, photos, deps);
  if (!upload.success) {
    return { success: false, error: upload.error, conversationId };
  }

  const writes = buildDirectPhotoMessageWrites({
    senderUid,
    recipientUid,
    mediaPaths: upload.paths,
    aspectRatios: upload.aspectRatios,
    messageId: messageRef.id,
    createdAt,
    isFirstMessage,
  });

  const batch = api.writeBatch(db);
  if (isFirstMessage) {
    batch.set(conversationRef, writes.conversation);
    Object.entries(writes.members).forEach(([uid, member]) => {
      batch.set(api.doc(conversationRef, 'members', uid), member);
    });
  } else {
    batch.update(conversationRef, writes.conversation);
  }

  batch.set(messageRef, writes.message);
  batch.set(api.doc(db, 'users', senderUid, 'conversationStates', conversationId), writes.senderState, { merge: true });
  if (writes.recipientState) {
    batch.set(api.doc(db, 'users', recipientUid, 'conversationStates', conversationId), writes.recipientState, { merge: true });
  }
  batch.set(api.doc(db, 'users', recipientUid, 'notifications', messageRef.id), writes.recipientNotification);

  try {
    await batch.commit();
    return { success: true, conversationId, messageId: messageRef.id, mediaPaths: upload.paths };
  } catch (error) {
    if (upload.paths.length > 0) {
      try {
        await deleteChatPhotoPathsAsync(upload.paths, deps);
      } catch (_) {
        // Best-effort cleanup only.
      }
    }
    return { success: false, error: error?.message || String(error), conversationId, mediaPaths: upload.paths };
  }
}

async function sendGroupPhotoMessage({ db, conversation, senderUid, photos }, deps = {}) {
  const api = deps.firestoreApi || defaultFirestoreApi();
  const conversationRef = api.doc(db, 'conversations', conversation.id);
  const messageRef = api.doc(api.collection(conversationRef, 'messages'));
  const createdAt = nowValue(api);

  const upload = await uploadChatPhotosAsync(conversation.id, photos, deps);
  if (!upload.success) {
    return { success: false, error: upload.error, conversationId: conversation.id };
  }

  const writes = buildGroupPhotoMessageWrites({
    conversationId: conversation.id,
    memberUids: conversation.memberUids || [],
    senderUid,
    mediaPaths: upload.paths,
    aspectRatios: upload.aspectRatios,
    messageId: messageRef.id,
    createdAt,
  });

  const batch = api.writeBatch(db);
  batch.update(conversationRef, writes.conversationUpdate);
  batch.set(messageRef, writes.message);
  batch.set(api.doc(db, 'users', senderUid, 'conversationStates', conversation.id), writes.senderState, { merge: true });
  Object.entries(writes.recipientNotifications).forEach(([uid, notification]) => {
    batch.set(api.doc(db, 'users', uid, 'notifications', messageRef.id), notification);
  });

  try {
    await batch.commit();
    return { success: true, conversationId: conversation.id, messageId: messageRef.id, mediaPaths: upload.paths };
  } catch (error) {
    if (upload.paths.length > 0) {
      try {
        await deleteChatPhotoPathsAsync(upload.paths, deps);
      } catch (_) {
        // Best-effort cleanup only.
      }
    }
    return { success: false, error: error?.message || String(error), conversationId: conversation.id, mediaPaths: upload.paths };
  }
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
