const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { createGroupConversationCallable } = require('./group-create');

admin.initializeApp();

exports.createGroupConversation = onCall(async (request) => createGroupConversationCallable(request, {
  db: admin.firestore(),
  ErrorClass: HttpsError,
  now: () => admin.firestore.FieldValue.serverTimestamp(),
}));
