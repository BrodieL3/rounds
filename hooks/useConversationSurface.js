import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { collection, deleteDoc, doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { buildConversationTitle, buildEmptyState } from '../lib/friends/conversation-surface';
import { ALLOWED_REACTIONS, buildReactionPayload } from '../lib/friends/reactions-service';
import { db, functions as cloudFunctions, storage } from '../lib/firebase';

const {
  loadConversation,
  loadUserProfile,
  markConversationSeen,
  normalizeTextMessage,
  sendDirectTextMessage,
  subscribeConversationMessages,
} = require('../lib/friends/dm-service');
const { sendGroupTextMessage } = require('../lib/friends/group-service');
const { buildReplyPreview } = require('../lib/friends/reply-service');
const {
  buildReportPayload,
  deleteMessageForEveryone,
  hideMessageForSelf,
  reportTarget,
} = require('../lib/friends/safety-service');
const {
  pickChatPhotosAsync,
  sendDirectPhotoMessage,
  sendGroupPhotoMessage,
} = require('../lib/friends/photo-service');
const {
  castPollVote,
  sendDirectPollMessage,
  sendGroupPollMessage,
} = require('../lib/friends/poll-service');
const {
  sendDirectLocationMessage,
  sendGroupLocationMessage,
} = require('../lib/friends/location-service');
const {
  sendDirectVenueLinkMessage,
  sendGroupVenueLinkMessage,
} = require('../lib/friends/venue-link-service');
const {
  sendDirectVoiceMessage,
  sendGroupVoiceMessage,
} = require('../lib/friends/voice-service');
const {
  startRecordingTimer,
  startVoiceRecordingAsync,
  stopVoiceRecordingAsync,
} = require('../lib/friends/voice-recorder');

export default function useConversationSurface({ conversationId, recipientUid, user }) {
  const [otherUser, setOtherUser] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [conversationReady, setConversationReady] = useState(false);
  const [conversationReloadKey, setConversationReloadKey] = useState(0);
  const [notFound, setNotFound] = useState(false);
  const [senderProfiles, setSenderProfiles] = useState({});
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendingPhotos, setSendingPhotos] = useState(false);
  const [photoUrls, setPhotoUrls] = useState({});
  const [pollComposerOpen, setPollComposerOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);
  const [sendingPoll, setSendingPoll] = useState(false);
  const [sendingLocation, setSendingLocation] = useState(false);
  const [voiceRecording, setVoiceRecording] = useState(null);
  const [voiceRecordElapsed, setVoiceRecordElapsed] = useState(0);
  const [voiceRecordingTimer, setVoiceRecordingTimer] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [messageReactions, setMessageReactions] = useState({});

  const isGroup = conversation?.type === 'group';
  const title = buildConversationTitle({ conversation, otherUser });

  useEffect(() => {
    if (!recipientUid) return;
    loadUserProfile({ db, uid: recipientUid })
      .then(setOtherUser)
      .catch((err) => console.error('DM profile load error:', err));
  }, [recipientUid]);

  useEffect(() => {
    if (!conversationId) return undefined;
    let mounted = true;
    let unsubscribe;

    setConversationReady(false);
    setNotFound(false);
    loadConversation({ db, conversationId })
      .then((loadedConversation) => {
        if (!mounted) return;
        if (!loadedConversation) {
          if (!recipientUid) setNotFound(true);
          return;
        }
        setConversation(loadedConversation);
        setConversationReady(true);
        unsubscribe = subscribeConversationMessages({
          db,
          uid: user?.uid,
          conversationId,
          onChange: setMessages,
          onError: (err) => console.error('Conversation messages snapshot error:', err),
        });
      })
      .catch((err) => console.error('Conversation load error:', err));

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [conversationId, recipientUid, conversationReloadKey, user]);

  useEffect(() => {
    if (!user || !conversationId || !conversationReady) return;
    markConversationSeen({ db, uid: user.uid, conversationId })
      .catch((err) => console.error('Conversation seen update error:', err));
  }, [user, conversationId, conversationReady, messages.length]);

  useEffect(() => {
    if (!isGroup) return;
    const missingSenderUids = Array.from(new Set(
      messages
        .map((message) => message.senderUid)
        .filter((uid) => uid && uid !== user?.uid && !senderProfiles[uid]),
    ));
    if (missingSenderUids.length === 0) return;

    Promise.all(missingSenderUids.map(async (uid) => {
      const profile = await loadUserProfile({ db, uid });
      return [uid, profile || { uid }];
    }))
      .then((entries) => {
        setSenderProfiles((current) => ({ ...current, ...Object.fromEntries(entries) }));
      })
      .catch((err) => console.error('Group sender profile load error:', err));
  }, [isGroup, messages, senderProfiles, user]);

  useEffect(() => {
    const photoMessages = messages.filter((m) => m.type === 'photo' && m.mediaPaths?.length > 0);
    const missing = photoMessages.filter((m) => !photoUrls[m.id]);
    if (missing.length === 0) return;

    Promise.all(missing.map(async (message) => {
      try {
        const urls = await Promise.all(
          message.mediaPaths.map((path) => getDownloadURL(ref(storage, path))),
        );
        return [message.id, urls];
      } catch (err) {
        console.error('Photo URL resolve error:', err);
        return [message.id, []];
      }
    })).then((entries) => {
      setPhotoUrls((current) => ({ ...current, ...Object.fromEntries(entries) }));
    });
  }, [messages, photoUrls]);

  useEffect(() => {
    if (!conversationId || messages.length === 0) {
      setMessageReactions({});
      return undefined;
    }

    const unsubscribes = messages.map((message) => onSnapshot(
      collection(db, 'conversations', conversationId, 'messages', message.id, 'reactions'),
      (snapshot) => {
        const reactions = snapshot.docs
          .map((reactionDoc) => ({ id: reactionDoc.id, ...reactionDoc.data() }))
          .sort((a, b) => a.uid.localeCompare(b.uid));
        setMessageReactions((current) => ({ ...current, [message.id]: reactions }));
      },
      (err) => console.error('Message reactions snapshot error:', err),
    ));

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe?.());
  }, [conversationId, messages]);

  const emptyState = useMemo(() => buildEmptyState({ isGroup, title }), [isGroup, title]);

  const send = useCallback(async () => {
    if (!user || sending) return;
    if (!isGroup && !recipientUid) return;
    if (isGroup && !conversation) return;

    let normalized;
    try {
      normalized = normalizeTextMessage(text);
    } catch (err) {
      Alert.alert('Message not sent', err.message);
      return;
    }

    setSending(true);
    try {
      const replyMeta = replyingTo ? buildReplyPreview(replyingTo) : {};

      if (conversation?.type === 'group') {
        await sendGroupTextMessage({ db, conversation, senderUid: user.uid, text: normalized, ...replyMeta });
      } else {
        await sendDirectTextMessage({
          db,
          senderUid: user.uid,
          recipientUid,
          text: normalized,
          ...replyMeta,
        });
        setConversationReloadKey((key) => key + 1);
      }
      setText('');
      setReplyingTo(null);
    } catch (err) {
      Alert.alert('Message failed', err.message);
    } finally {
      setSending(false);
    }
  }, [conversation, isGroup, recipientUid, replyingTo, sending, text, user]);

  const sendPhotos = useCallback(async () => {
    if (!user || sendingPhotos) return;
    if (!isGroup && !recipientUid) return;
    if (isGroup && !conversation) return;

    const picked = await pickChatPhotosAsync();
    if (!picked.success) {
      if (!picked.canceled && picked.error) {
        Alert.alert('Photo picker failed', picked.error);
      }
      return;
    }

    const photos = picked.uris.map((uri, index) => ({
      uri,
      aspectRatio: picked.aspectRatios[index] || 1,
    }));

    setSendingPhotos(true);
    try {
      if (conversation?.type === 'group') {
        await sendGroupPhotoMessage({ db, storage, conversation, senderUid: user.uid, photos });
      } else {
        await sendDirectPhotoMessage({ db, storage, senderUid: user.uid, recipientUid, photos });
        setConversationReloadKey((key) => key + 1);
      }
    } catch (err) {
      Alert.alert('Photo send failed', err.message);
    } finally {
      setSendingPhotos(false);
    }
  }, [conversation, isGroup, recipientUid, sendingPhotos, user]);

  const sendPhotoAssets = useCallback(async (photos) => {
    if (!user || sendingPhotos || !photos?.length) return;
    if (!isGroup && !recipientUid) return;
    if (isGroup && !conversation) return;

    setSendingPhotos(true);
    try {
      if (conversation?.type === 'group') {
        await sendGroupPhotoMessage({ db, storage, conversation, senderUid: user.uid, photos });
      } else {
        await sendDirectPhotoMessage({ db, storage, senderUid: user.uid, recipientUid, photos });
        setConversationReloadKey((key) => key + 1);
      }
    } catch (err) {
      Alert.alert('Photo send failed', err.message);
    } finally {
      setSendingPhotos(false);
    }
  }, [conversation, isGroup, recipientUid, sendingPhotos, user]);

  const sendVenueLink = useCallback(async ({ venue, cityKey }) => {
    if (!user) return;
    if (!isGroup && !recipientUid) return;
    if (isGroup && !conversation) return;

    try {
      if (conversation?.type === 'group') {
        await sendGroupVenueLinkMessage({ db, conversation, senderUid: user.uid, venue, cityKey });
      } else {
        await sendDirectVenueLinkMessage({ db, senderUid: user.uid, recipientUid, venue, cityKey });
        setConversationReloadKey((key) => key + 1);
      }
    } catch (err) {
      Alert.alert('Venue not sent', err.message);
    }
  }, [conversation, isGroup, recipientUid, user]);

  const sendPoll = useCallback(async () => {
    if (!user || sendingPoll) return;
    if (!isGroup && !recipientUid) return;
    if (isGroup && !conversation) return;

    const question = pollQuestion.trim();
    const options = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (!question) {
      Alert.alert('Poll not sent', 'Question is required');
      return;
    }
    if (options.length < 2) {
      Alert.alert('Poll not sent', 'At least 2 options are required');
      return;
    }

    setSendingPoll(true);
    try {
      if (conversation?.type === 'group') {
        await sendGroupPollMessage({
          db,
          conversation,
          senderUid: user.uid,
          question,
          options: options.map((text) => ({ text })),
          allowMultiple: pollAllowMultiple,
        });
      } else {
        await sendDirectPollMessage({
          db,
          senderUid: user.uid,
          recipientUid,
          question,
          options: options.map((text) => ({ text })),
          allowMultiple: pollAllowMultiple,
        });
        setConversationReloadKey((key) => key + 1);
      }
      setPollComposerOpen(false);
      setPollQuestion('');
      setPollOptions(['', '']);
      setPollAllowMultiple(false);
    } catch (err) {
      Alert.alert('Poll send failed', err.message);
    } finally {
      setSendingPoll(false);
    }
  }, [conversation, isGroup, recipientUid, pollAllowMultiple, pollOptions, pollQuestion, sendingPoll, user]);

  const sendLocation = useCallback(async ({ lat, lng, label }) => {
    if (!user || sendingLocation) return;
    if (!isGroup && !recipientUid) return;
    if (isGroup && !conversation) return;

    setSendingLocation(true);
    try {
      if (conversation?.type === 'group') {
        await sendGroupLocationMessage({
          db, conversation, senderUid: user.uid, lat, lng, label,
        });
      } else {
        await sendDirectLocationMessage({
          db, senderUid: user.uid, recipientUid, lat, lng, label,
        });
        setConversationReloadKey((key) => key + 1);
      }
    } catch (err) {
      Alert.alert('Location send failed', err.message);
    } finally {
      setSendingLocation(false);
    }
  }, [conversation, isGroup, recipientUid, sendingLocation, user]);

  const stopRecordingRef = useRef(null);

  const stopRecordingAndSend = useCallback(async () => {
    if (!voiceRecording || !user) return;
    voiceRecordingTimer?.stop();
    setVoiceRecordingTimer(null);

    try {
      const { uri, durationMs } = await stopVoiceRecordingAsync(voiceRecording);
      setVoiceRecording(null);
      setVoiceRecordElapsed(0);

      if (durationMs < 1000) {
        Alert.alert('Voice note too short', 'Hold to record for at least 1 second.');
        return;
      }

      const timestamp = Date.now();
      const path = `conversations/${conversationId}/voice/voice_${timestamp}.m4a`;
      const storageRef = ref(storage, path);
      const response = await fetch(uri);
      const blob = await response.blob();
      await uploadBytes(storageRef, blob, { contentType: 'audio/m4a' });

      if (conversation?.type === 'group') {
        await sendGroupVoiceMessage({
          db, conversation, senderUid: user.uid, storagePath: path, durationMs,
        });
      } else {
        await sendDirectVoiceMessage({
          db, senderUid: user.uid, recipientUid, storagePath: path, durationMs,
        });
        setConversationReloadKey((key) => key + 1);
      }
    } catch (err) {
      Alert.alert('Voice send failed', err.message);
      setVoiceRecording(null);
      setVoiceRecordElapsed(0);
    }
  }, [conversation, conversationId, recipientUid, user, voiceRecording, voiceRecordingTimer]);

  stopRecordingRef.current = stopRecordingAndSend;

  const startRecording = useCallback(async () => {
    if (!user) return;
    try {
      const { recording } = await startVoiceRecordingAsync();
      setVoiceRecording(recording);
      const timer = startRecordingTimer((elapsed) => {
        setVoiceRecordElapsed(elapsed);
        if (elapsed >= 60000) {
          stopRecordingRef.current?.();
        }
      });
      setVoiceRecordingTimer(timer);
    } catch (err) {
      Alert.alert('Recording failed', err.message);
      setVoiceRecording(null);
    }
  }, [user]);

  const toggleMessageReaction = useCallback(async (message, emoji) => {
    if (!user || !conversationId) return;
    try {
      const reactionRef = doc(db, 'conversations', conversationId, 'messages', message.id, 'reactions', user.uid);
      const existingSnap = await getDoc(reactionRef);
      if (existingSnap.exists() && existingSnap.data().emoji === emoji) {
        await deleteDoc(reactionRef);
      } else {
        await setDoc(reactionRef, buildReactionPayload({ uid: user.uid, emoji, createdAt: serverTimestamp() }));
      }
    } catch (err) {
      Alert.alert('Reaction failed', err.message);
    }
  }, [conversationId, user]);

  const hideMessage = useCallback(async (message) => {
    if (!user || !conversationId) return;
    try {
      await hideMessageForSelf({ db, uid: user.uid, conversationId, messageId: message.id });
      setMessages((current) => current.filter((entry) => entry.id !== message.id));
    } catch (err) {
      Alert.alert('Hide failed', err.message);
    }
  }, [conversationId, user]);

  const deleteForEveryone = useCallback((message) => {
    if (!user || !conversationId) return;
    Alert.alert('Delete message?', 'This leaves a tombstone for everyone in the chat.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete for everyone',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMessageForEveryone({ functions: cloudFunctions, conversationId, messageId: message.id });
          } catch (err) {
            Alert.alert('Delete failed', err.message);
          }
        },
      },
    ]);
  }, [conversationId, user]);

  const reportMessage = useCallback(async (message) => {
    if (!user || !conversationId) return;
    try {
      const report = buildReportPayload({
        reporterUid: user.uid,
        targetType: 'message',
        targetId: message.id,
        conversationId,
        messageId: message.id,
        reportedUid: message.senderUid,
        reason: 'Reported from conversation',
        createdAt: new Date(),
      });
      await reportTarget({ db, report });
      await hideMessageForSelf({ db, uid: user.uid, conversationId, messageId: message.id });
      setMessages((current) => current.filter((entry) => entry.id !== message.id));
      Alert.alert('Report submitted', 'Message hidden for you.');
    } catch (err) {
      Alert.alert('Report failed', err.message);
    }
  }, [conversationId, user]);

  const votePoll = useCallback(async (message, optionId) => {
    if (!user || !conversationId) return;
    try {
      await castPollVote({
        db,
        conversationId,
        messageId: message.id,
        uid: user.uid,
        optionIds: [optionId],
      });
    } catch (err) {
      Alert.alert('Vote failed', err.message);
    }
  }, [conversationId, user]);

  return {
    conversation,
    messages,
    conversationReady,
    notFound,
    senderProfiles,
    text,
    setText,
    sending,
    sendingPhotos,
    photoUrls,
    pollComposerOpen,
    setPollComposerOpen,
    pollQuestion,
    setPollQuestion,
    pollOptions,
    setPollOptions,
    pollAllowMultiple,
    setPollAllowMultiple,
    sendingPoll,
    sendingLocation,
    voiceRecording,
    voiceRecordElapsed,
    replyingTo,
    setReplyingTo,
    messageReactions,
    isGroup,
    title,
    emptyTitle: emptyState.title,
    emptyBody: emptyState.body,
    conversationId,
    recipientUid,
    send,
    sendPhotos,
    sendPhotoAssets,
    sendPoll,
    sendLocation,
    sendVenueLink,
    startRecording,
    stopRecordingAndSend,
    toggleMessageReaction,
    hideMessage,
    deleteForEveryone,
    reportMessage,
    votePoll,
  };
}
