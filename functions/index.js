const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { createGroupConversationCallable } = require('./group-create');
const {
  inviteToGroupCallable,
  leaveGroupCallable,
  removeGroupMemberCallable,
} = require('./group-lifecycle');
const { sharePrivateRatingCallable } = require('./unlisted-share');
const {
  blockUserCallable,
  deleteMessageForEveryoneCallable,
} = require('./safety');

admin.initializeApp();

function callableDeps() {
  return {
    db: admin.firestore(),
    ErrorClass: HttpsError,
    now: () => admin.firestore.FieldValue.serverTimestamp(),
    FieldValue: admin.firestore.FieldValue,
  };
}

exports.createGroupConversation = onCall(async (request) => createGroupConversationCallable(request, callableDeps()));
exports.inviteToGroup = onCall(async (request) => inviteToGroupCallable(request, callableDeps()));
exports.removeGroupMember = onCall(async (request) => removeGroupMemberCallable(request, callableDeps()));
exports.leaveGroup = onCall(async (request) => leaveGroupCallable(request, callableDeps()));
exports.sharePrivateRating = onCall(async (request) => sharePrivateRatingCallable(request, callableDeps()));
exports.blockUser = onCall(async (request) => blockUserCallable(request, callableDeps()));
exports.deleteMessageForEveryone = onCall(async (request) => deleteMessageForEveryoneCallable(request, callableDeps()));
