function requiredString(value, fieldName) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) throw new Error(`${fieldName} is required`);
  return normalized;
}

function buildSnippet(message = {}) {
  if (message.deletedForEveryoneAt) {
    return 'Original message deleted.';
  }

  switch (message.type) {
    case 'text':
      return message.text || '';
    case 'venue_link':
      return message.venueName || 'Venue';
    case 'review_link':
      return message.venueName || 'Review';
    case 'photo':
      return 'Photo';
    case 'voice':
      return 'Voice note';
    case 'poll':
      return `Poll: ${message.question || ''}`;
    case 'location':
      return message.label || 'Location';
    default:
      return 'Message';
  }
}

function buildReplyPreview(message = {}) {
  return {
    replyToMessageId: requiredString(message.id, 'message.id'),
    replyToPreview: {
      senderUid: requiredString(message.senderUid, 'message.senderUid'),
      type: message.type || 'text',
      snippet: buildSnippet(message).slice(0, 240),
    },
  };
}

function buildReplyMessagePayload({ senderUid, text, replyToMessageId, replyToPreview, createdAt }) {
  const uid = requiredString(senderUid, 'senderUid');
  const body = requiredString(text, 'text');
  const replyId = requiredString(replyToMessageId, 'replyToMessageId');

  if (!replyToPreview || typeof replyToPreview !== 'object') {
    throw new Error('replyToPreview is required');
  }

  const previewSenderUid = requiredString(replyToPreview.senderUid, 'replyToPreview.senderUid');
  const snippet = typeof replyToPreview.snippet === 'string' ? replyToPreview.snippet.trim() : '';
  if (snippet.length > 240) throw new Error('replyToPreview.snippet must be 240 characters or fewer');

  return {
    senderUid: uid,
    type: 'text',
    text: body,
    replyToMessageId: replyId,
    replyToPreview: {
      senderUid: previewSenderUid,
      type: replyToPreview.type || 'text',
      snippet,
    },
    createdAt,
    deletedForEveryoneAt: null,
  };
}

module.exports = {
  buildReplyMessagePayload,
  buildReplyPreview,
  buildSnippet,
};
module.exports.__esModule = true;
