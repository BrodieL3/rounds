const { buildDirectConversationId, getSortedPairUids } = require('./ids');

const MAX_POLL_OPTIONS = 20;
const MAX_POLL_QUESTION_LENGTH = 500;

function defaultFirestoreApi() {
  return require('firebase/firestore');
}

function nowValue(api) {
  return api && typeof api.serverTimestamp === 'function' ? api.serverTimestamp() : new Date();
}

function requiredString(value, fieldName) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) throw new Error(`${fieldName} is required`);
  return normalized;
}

function normalizePollOptions(options = []) {
  if (!Array.isArray(options) || options.length < 2) {
    throw new Error('Poll must have at least 2 options');
  }
  if (options.length > MAX_POLL_OPTIONS) {
    throw new Error(`Poll must have ${MAX_POLL_OPTIONS} options or fewer`);
  }

  return options.map((option, index) => ({
    id: option.id || `opt_${index}_${Date.now()}`,
    text: typeof option.text === 'string' ? option.text.trim() : '',
    addedByUid: option.addedByUid || null,
  })).filter((option) => option.text.length > 0);
}

function buildPollMessagePayload({
  senderUid,
  question,
  options,
  allowMultiple = false,
  allowMemberOptions = false,
  closesAt = null,
  createdAt,
}) {
  const uid = requiredString(senderUid, 'senderUid');
  const q = requiredString(question, 'question');
  if (q.length > MAX_POLL_QUESTION_LENGTH) {
    throw new Error(`Poll question must be ${MAX_POLL_QUESTION_LENGTH} characters or fewer`);
  }

  const normalizedOptions = normalizePollOptions(options);

  return {
    senderUid: uid,
    type: 'poll',
    question: q,
    options: normalizedOptions,
    allowMultiple: Boolean(allowMultiple),
    allowMemberOptions: Boolean(allowMemberOptions),
    closesAt: closesAt || null,
    closedAt: null,
    createdAt,
    deletedForEveryoneAt: null,
  };
}

function buildPollLastMessage({ messageId, senderUid, question, createdAt }) {
  return {
    id: messageId,
    senderUid,
    type: 'poll',
    question,
    createdAt,
  };
}

function buildDirectPollMessageWrites({
  senderUid,
  recipientUid,
  question,
  options,
  allowMultiple,
  allowMemberOptions,
  closesAt,
  messageId,
  createdAt,
  isFirstMessage,
}) {
  const conversationId = buildDirectConversationId(senderUid, recipientUid);
  const memberUids = getSortedPairUids(senderUid, recipientUid);
  const payload = buildPollMessagePayload({
    senderUid,
    question,
    options,
    allowMultiple,
    allowMemberOptions,
    closesAt,
    createdAt,
  });
  const lastMessage = buildPollLastMessage({ messageId, senderUid, question: payload.question, createdAt });

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

function buildGroupPollMessageWrites({
  conversationId,
  memberUids = [],
  senderUid,
  question,
  options,
  allowMultiple,
  allowMemberOptions,
  closesAt,
  messageId,
  createdAt,
}) {
  const payload = buildPollMessagePayload({
    senderUid,
    question,
    options,
    allowMultiple,
    allowMemberOptions,
    closesAt,
    createdAt,
  });
  const lastMessage = buildPollLastMessage({ messageId, senderUid, question: payload.question, createdAt });
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

function isPollClosed(poll = {}, now = Date.now()) {
  if (poll.closedAt) return true;
  if (poll.closesAt) {
    const closeTime = typeof poll.closesAt === 'number' ? poll.closesAt : poll.closesAt?.getTime?.() || poll.closesAt?.toMillis?.() || 0;
    return closeTime <= now;
  }
  return false;
}

function canVoteInPoll(poll = {}, optionIds = []) {
  if (!poll || poll.type !== 'poll') return false;
  if (isPollClosed(poll)) return false;
  if (!Array.isArray(optionIds) || optionIds.length === 0) return false;

  const validOptionIds = new Set((poll.options || []).map((o) => o.id));
  if (!optionIds.every((id) => validOptionIds.has(id))) return false;

  if (!poll.allowMultiple && optionIds.length > 1) return false;
  return true;
}

function buildPollVotePayload({ uid, optionIds, createdAt }) {
  return {
    uid: requiredString(uid, 'uid'),
    optionIds: Array.isArray(optionIds) ? [...optionIds] : [],
    createdAt,
    updatedAt: createdAt,
  };
}

function buildPollResults({ votes = [], options = [] } = {}) {
  const counts = {};
  options.forEach((o) => { counts[o.id] = 0; });

  votes.forEach((vote) => {
    (vote.optionIds || []).forEach((id) => {
      if (counts[id] !== undefined) counts[id]++;
    });
  });

  return {
    totalVotes: votes.length,
    optionResults: options.map((o) => ({
      id: o.id,
      text: o.text,
      count: counts[o.id] || 0,
    })),
  };
}

function buildPollOptionAppend(existingOptions = [], proposedOptions = [], uid, allowMemberOptions = false) {
  if (!allowMemberOptions) {
    throw new Error('Option append is not allowed for this poll');
  }

  if (proposedOptions.length <= existingOptions.length) {
    throw new Error('Proposed options must add at least one new option');
  }

  const existingMap = new Map(existingOptions.map((o) => [o.id, o]));
  for (const existing of existingOptions) {
    const match = proposedOptions.find((o) => o.id === existing.id);
    if (!match || match.text !== existing.text) {
      throw new Error('Cannot modify or remove existing poll options');
    }
  }

  const newOptions = proposedOptions.filter((o) => !existingMap.has(o.id));
  if (newOptions.length === 0) {
    throw new Error('No new options to append');
  }

  return { options: proposedOptions };
}

async function sendDirectPollMessage({ db, senderUid, recipientUid, question, options, allowMultiple, allowMemberOptions, closesAt }, deps = {}) {
  const api = deps.firestoreApi || defaultFirestoreApi();
  const conversationId = buildDirectConversationId(senderUid, recipientUid);
  const conversationRef = api.doc(db, 'conversations', conversationId);
  const messageRef = api.doc(api.collection(conversationRef, 'messages'));
  const createdAt = nowValue(api);

  const conversationSnap = await api.getDoc(conversationRef);
  const isFirstMessage = !conversationSnap.exists();

  const writes = buildDirectPollMessageWrites({
    senderUid,
    recipientUid,
    question,
    options,
    allowMultiple,
    allowMemberOptions,
    closesAt,
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

  await batch.commit();
  return { success: true, conversationId, messageId: messageRef.id };
}

async function sendGroupPollMessage({ db, conversation, senderUid, question, options, allowMultiple, allowMemberOptions, closesAt }, deps = {}) {
  const api = deps.firestoreApi || defaultFirestoreApi();
  const conversationRef = api.doc(db, 'conversations', conversation.id);
  const messageRef = api.doc(api.collection(conversationRef, 'messages'));
  const createdAt = nowValue(api);

  const writes = buildGroupPollMessageWrites({
    conversationId: conversation.id,
    memberUids: conversation.memberUids || [],
    senderUid,
    question,
    options,
    allowMultiple,
    allowMemberOptions,
    closesAt,
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

  await batch.commit();
  return { success: true, conversationId: conversation.id, messageId: messageRef.id };
}

async function castPollVote({ db, conversationId, messageId, uid, optionIds }, deps = {}) {
  const api = deps.firestoreApi || defaultFirestoreApi();
  const voteRef = api.doc(db, 'conversations', conversationId, 'messages', messageId, 'votes', uid);
  const messageSnap = await api.getDoc(api.doc(db, 'conversations', conversationId, 'messages', messageId));

  if (!messageSnap.exists()) {
    throw new Error('Poll not found');
  }

  const poll = messageSnap.data();
  if (!canVoteInPoll(poll, optionIds)) {
    throw new Error('Cannot vote in this poll');
  }

  const now = nowValue(api);
  const existingSnap = await api.getDoc(voteRef);

  if (existingSnap.exists()) {
    await api.updateDoc(voteRef, {
      optionIds: [...optionIds],
      updatedAt: now,
    });
  } else {
    await api.setDoc(voteRef, buildPollVotePayload({ uid, optionIds, createdAt: now }));
  }

  return { success: true };
}

module.exports = {
  MAX_POLL_OPTIONS,
  MAX_POLL_QUESTION_LENGTH,
  buildDirectPollMessageWrites,
  buildGroupPollMessageWrites,
  buildPollLastMessage,
  buildPollMessagePayload,
  buildPollOptionAppend,
  buildPollResults,
  buildPollVotePayload,
  canVoteInPoll,
  castPollVote,
  isPollClosed,
  normalizePollOptions,
  sendDirectPollMessage,
  sendGroupPollMessage,
};
module.exports.__esModule = true;
