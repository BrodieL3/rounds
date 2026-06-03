import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { collection, deleteDoc, doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import VoiceBubble from '../../components/VoiceBubble';
import { COLORS, COHORT_LABELS } from '../../lib/constants';
import { ALLOWED_REACTIONS, buildReactionPayload } from '../../lib/friends/reactions-service';
import { db, functions as cloudFunctions, storage } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { getVenueVisualFallback } from '../../lib/venue-visuals';

const {
  loadConversation,
  loadUserProfile,
  markConversationSeen,
  normalizeTextMessage,
  sendDirectTextMessage,
  subscribeConversationMessages,
} = require('../../lib/friends/dm-service');
const { sendGroupTextMessage } = require('../../lib/friends/group-service');
const { buildReplyPreview } = require('../../lib/friends/reply-service');
const {
  buildReportPayload,
  deleteMessageForEveryone,
  hideMessageForSelf,
  reportTarget,
} = require('../../lib/friends/safety-service');
const {
  pickChatPhotosAsync,
  sendDirectPhotoMessage,
  sendGroupPhotoMessage,
} = require('../../lib/friends/photo-service');
const {
  castPollVote,
  sendDirectPollMessage,
  sendGroupPollMessage,
} = require('../../lib/friends/poll-service');
const {
  sendDirectLocationMessage,
  sendGroupLocationMessage,
} = require('../../lib/friends/location-service');
const {
  sendDirectVoiceMessage,
  sendGroupVoiceMessage,
} = require('../../lib/friends/voice-service');
const {
  startRecordingTimer,
  startVoiceRecordingAsync,
  stopVoiceRecordingAsync,
} = require('../../lib/friends/voice-recorder');

function formatVoiceDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function ConversationScreen() {
  const { id, otherUid } = useLocalSearchParams();
  const { user } = useAuth();
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

  const conversationId = Array.isArray(id) ? id[0] : id;
  const recipientUid = Array.isArray(otherUid) ? otherUid[0] : otherUid;
  const isGroup = conversation?.type === 'group';
  const title = isGroup
    ? (conversation?.name || 'Group chat')
    : (otherUser?.displayName || otherUser?.username || 'Direct message');

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

  const emptyTitle = useMemo(() => (
    isGroup ? `Start planning in ${title}.` : `Start planning with ${title}.`
  ), [isGroup, title]);
  const emptyBody = isGroup ? 'Send the first message to this group.' : 'Send the first message to create this DM.';

  const openGroupInfo = useCallback(() => {
    if (!isGroup || !conversationId) return;
    router.push({ pathname: '/conversation/[id]/info', params: { id: conversationId } });
  }, [conversationId, isGroup]);

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

  const startRecording = useCallback(async () => {
    if (!user) return;
    try {
      const { recording } = await startVoiceRecordingAsync();
      setVoiceRecording(recording);
      const timer = startRecordingTimer((elapsed) => {
        setVoiceRecordElapsed(elapsed);
        if (elapsed >= 60000) {
          stopRecordingAndSend();
        }
      });
      setVoiceRecordingTimer(timer);
    } catch (err) {
      Alert.alert('Recording failed', err.message);
      setVoiceRecording(null);
    }
  }, [user]);

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

      // Upload to Storage
      const timestamp = Date.now();
      const path = `conversations/${conversationId}/voice/voice_${timestamp}.m4a`;
      const storageRef = ref(storage, path);
      const response = await fetch(uri);
      const blob = await response.blob();
      await uploadBytes(storageRef, blob, {
        contentType: 'audio/m4a',
      });

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

  const showAttachmentMenu = useCallback(() => {
    Alert.alert('Attach', undefined, [
      { text: 'Photo', onPress: sendPhotos },
      { text: 'Poll', onPress: () => setPollComposerOpen(true) },
      {
        text: 'Voice',
        onPress: startRecording,
      },
      {
        text: 'Location',
        onPress: () => {
          Alert.alert('Share location', undefined, [
            {
              text: 'Current location',
              onPress: async () => {
                try {
                  const { requestForegroundPermissionsAsync, getCurrentPositionAsync } = await import('expo-location');
                  const { status } = await requestForegroundPermissionsAsync();
                  if (status !== 'granted') {
                    Alert.alert('Permission denied', 'Location permission is required.');
                    return;
                  }
                  const { coords } = await getCurrentPositionAsync({});
                  await sendLocation({
                    lat: coords.latitude,
                    lng: coords.longitude,
                    label: 'My location',
                  });
                } catch (err) {
                  Alert.alert('Location failed', err.message);
                }
              },
            },
            {
              text: 'Cancel',
              style: 'cancel',
            },
          ]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [sendPhotos, sendLocation, startRecording]);

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

  const renderMessage = ({ item }) => {
    const isMine = item.senderUid === user?.uid;
    const sender = senderProfiles[item.senderUid];
    const senderLabel = isGroup && !isMine
      ? (sender?.displayName || sender?.username || item.senderUid)
      : null;
    const isVenueLink = item.type === 'venue_link';
    const isReviewLink = item.type === 'review_link';
    const isPhoto = item.type === 'photo';
    const isPoll = item.type === 'poll';
    const visual = (isVenueLink || isReviewLink) ? getVenueVisualFallback({
      id: item.venueId,
      name: item.venueName,
      cohort: item.venueCohort,
    }) : null;
    const sentimentColor = isReviewLink
      ? (item.sentiment === 'loved' ? COLORS.success : item.sentiment === 'fine' ? COLORS.accent : COLORS.danger)
      : null;
    const canDeleteForEveryone = isMine && !item.deletedForEveryoneAt;
    const canReport = !isMine && !item.deletedForEveryoneAt;
    const messagePhotoUrls = photoUrls[item.id] || [];
    const reactions = messageReactions[item.id] || [];

    return (
      <View style={[styles.messageRow, isMine ? styles.messageRowMine : styles.messageRowTheirs]}>
        <View style={[styles.messageStack, isMine ? styles.messageStackMine : styles.messageStackTheirs]}>
          {senderLabel ? <Text style={styles.senderLabel}>{senderLabel}</Text> : null}
          {item.replyToMessageId && item.replyToPreview ? (
            <View style={[styles.replyPreview, isMine ? styles.replyPreviewMine : styles.replyPreviewTheirs]}>
              <View style={styles.replyPreviewLine} />
              <View style={styles.replyPreviewContent}>
                <Text style={styles.replyPreviewSender} numberOfLines={1}>
                  {senderProfiles[item.replyToPreview.senderUid]?.displayName || senderProfiles[item.replyToPreview.senderUid]?.username || item.replyToPreview.senderUid}
                </Text>
                <Text style={styles.replyPreviewSnippet} numberOfLines={1}>
                  {item.replyToPreview.snippet}
                </Text>
              </View>
            </View>
          ) : null}
          {item.deletedForEveryoneAt ? (
            <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
              <Text style={[styles.messageText, isMine ? styles.messageTextMine : styles.messageTextTheirs]}>
                Message deleted.
              </Text>
            </View>
          ) : isPhoto ? (
            <View style={[styles.photoBubble, isMine ? styles.photoBubbleMine : styles.photoBubbleTheirs]}>
              {messagePhotoUrls.length === 0 ? (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="image" size={24} color={COLORS.textMuted} />
                </View>
              ) : item.mediaPaths.length === 1 ? (
                <Image
                  source={{ uri: messagePhotoUrls[0] }}
                  style={[
                    styles.photoImage,
                    { aspectRatio: item.aspectRatios?.[0] || 1 },
                  ]}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.photoGrid}>
                  {messagePhotoUrls.map((url, index) => (
                    <Image
                      key={item.mediaPaths[index] || index}
                      source={{ uri: url }}
                      style={[
                        styles.photoGridItem,
                        { aspectRatio: item.aspectRatios?.[index] || 1 },
                      ]}
                      resizeMode="cover"
                    />
                  ))}
                </View>
              )}
            </View>
          ) : isPoll ? (
            <View style={[styles.pollCard, isMine ? styles.pollCardMine : styles.pollCardTheirs]}>
              <Text style={styles.pollQuestion}>{item.question}</Text>
              {(item.options || []).map((option) => (
                <Pressable
                  key={option.id}
                  style={styles.pollOption}
                  onPress={async () => {
                    if (!user || !conversationId) return;
                    try {
                      await castPollVote({
                        db,
                        conversationId,
                        messageId: item.id,
                        uid: user.uid,
                        optionIds: [option.id],
                      });
                    } catch (err) {
                      Alert.alert('Vote failed', err.message);
                    }
                  }}
                >
                  <Text style={styles.pollOptionText}>{option.text}</Text>
                </Pressable>
              ))}
            </View>
          ) : item.type === 'location' ? (
            <Pressable
              style={[styles.locationCard, isMine ? styles.locationCardMine : styles.locationCardTheirs]}
              onPress={() => {
                const url = `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`;
                Linking.openURL(url).catch(() => Alert.alert('Could not open maps'));
              }}
            >
              <Ionicons name="location" size={20} color={COLORS.accent} />
              <View style={styles.locationCopy}>
                <Text style={styles.locationLabel} numberOfLines={2}>{item.label || 'Location'}</Text>
                <Text style={styles.locationCoords}>{item.lat?.toFixed(4)}, {item.lng?.toFixed(4)}</Text>
              </View>
            </Pressable>
          ) : item.type === 'voice' ? (
            <VoiceBubble
              message={item}
              isMine={isMine}
              conversationId={conversationId}
              db={db}
              storage={storage}
              user={user}
            />
          ) : isVenueLink ? (
            <Pressable
              accessibilityRole="button"
              style={[styles.venueLinkCard, isMine ? styles.venueLinkCardMine : styles.venueLinkCardTheirs]}
              onPress={() => router.push({ pathname: '/venue/[id]', params: { id: item.venueId } })}
            >
              <View style={[styles.venueLinkThumb, { backgroundColor: visual.colors[0] }]}>
                <Ionicons name={visual.iconName} size={20} color="#ffffff" />
              </View>
              <View style={styles.venueLinkCopy}>
                <Text style={styles.venueLinkLabel}>Venue</Text>
                <Text style={styles.venueLinkName} numberOfLines={1}>{item.venueName}</Text>
                <Text style={styles.venueLinkMeta} numberOfLines={1}>
                  {COHORT_LABELS[item.venueCohort] || item.venueCohort}
                </Text>
                {item.venueAddress ? (
                  <Text style={styles.venueLinkAddress} numberOfLines={1}>{item.venueAddress}</Text>
                ) : null}
              </View>
            </Pressable>
          ) : isReviewLink ? (
            <Pressable
              accessibilityRole="button"
              style={[styles.reviewLinkCard, isMine ? styles.reviewLinkCardMine : styles.reviewLinkCardTheirs]}
              onPress={() => router.push({ pathname: '/post/[id]', params: { id: item.ratingId } })}
            >
              <View style={[styles.reviewLinkThumb, { backgroundColor: visual.colors[0] }]}>
                <Ionicons name={visual.iconName} size={20} color="#ffffff" />
              </View>
              <View style={styles.reviewLinkCopy}>
                <View style={styles.reviewLinkHeader}>
                  <Text style={styles.reviewLinkLabel}>Review</Text>
                  {item.visibility && item.visibility !== 'public' && (
                    <Text style={styles.unlistedTag}>Unlisted</Text>
                  )}
                </View>
                <Text style={styles.reviewLinkVenue} numberOfLines={1}>{item.venueName}</Text>
                <Text style={[styles.reviewLinkSentiment, { color: sentimentColor }]}>
                  {item.sentiment === 'loved' ? '❤️ Loved it' : item.sentiment === 'fine' ? '👍 It was fine' : "👎 Didn't like it"}
                </Text>
                <Text style={styles.reviewLinkAuthor} numberOfLines={1}>
                  {item.authorDisplayName || item.authorUsername || 'Anonymous'}
                </Text>
                {item.notes ? (
                  <Text style={styles.reviewLinkNotes} numberOfLines={2}>{item.notes}</Text>
                ) : null}
              </View>
            </Pressable>
          ) : (
            <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
              <Text style={[styles.messageText, isMine ? styles.messageTextMine : styles.messageTextTheirs]}>
                {item.text}
              </Text>
            </View>
          )}
          <View style={[styles.messageActions, isMine ? styles.messageActionsMine : styles.messageActionsTheirs]}>
            <Pressable onPress={() => hideMessage(item)}>
              <Text style={styles.messageActionText}>Hide message</Text>
            </Pressable>
            {canDeleteForEveryone ? (
              <Pressable onPress={() => deleteForEveryone(item)}>
                <Text style={styles.messageActionDanger}>Delete for everyone</Text>
              </Pressable>
            ) : null}
            {canReport ? (
              <Pressable onPress={() => reportMessage(item)}>
                <Text style={styles.messageActionDanger}>Report message</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => {
              Alert.alert('React', undefined, [
                ...ALLOWED_REACTIONS.map((emoji) => ({
                  text: emoji,
                  onPress: () => toggleMessageReaction(item, emoji),
                })),
                { text: 'Cancel', style: 'cancel' },
              ]);
            }}>
              <Text style={styles.messageActionText}>React</Text>
            </Pressable>
            <Pressable onPress={() => setReplyingTo(item)}>
              <Text style={styles.messageActionText}>Reply</Text>
            </Pressable>
          </View>
          {reactions.length > 0 ? (
            <View style={[styles.reactionsBar, isMine ? styles.reactionsBarMine : styles.reactionsBarTheirs]}>
              {reactions.map((reaction) => (
                <Pressable
                  key={reaction.uid}
                  style={[
                    styles.reactionPill,
                    reaction.uid === user?.uid && styles.reactionPillSelf,
                  ]}
                  onPress={() => {
                    if (reaction.uid === user?.uid) {
                      toggleMessageReaction(item, reaction.emoji);
                    }
                  }}
                >
                  <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  if (notFound) {
    return (
      <View style={styles.screen}>
        <View style={styles.notFoundCard}>
          <Text style={styles.emptyTitle}>Conversation not found</Text>
          <Pressable onPress={() => router.back()} style={styles.sendButton}>
            <Text style={styles.sendText}>Go back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.screen}
    >
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </Pressable>
        <Pressable
          style={styles.headerTitleArea}
          onPress={openGroupInfo}
          disabled={!isGroup}
          accessibilityRole={isGroup ? 'button' : undefined}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{title.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.title}>{title}</Text>
          {isGroup ? <Ionicons name="information-circle-outline" size={22} color={COLORS.textMuted} /> : null}
        </Pressable>
      </View>

      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={messages.length === 0 ? styles.emptyContent : styles.messagesContent}
        ListEmptyComponent={(
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{emptyTitle}</Text>
            <Text style={styles.emptyBody}>{emptyBody}</Text>
          </View>
        )}
      />

      {voiceRecording ? (
        <View style={styles.voiceRecordingOverlay}>
          <View style={styles.voiceRecordingRow}>
            <View style={styles.voiceRecordingDot} />
            <Text style={styles.voiceRecordingText}>
              Recording {formatVoiceDuration(voiceRecordElapsed)}
            </Text>
          </View>
          <Pressable onPress={stopRecordingAndSend} style={styles.voiceRecordingStop}>
            <Ionicons name="stop" size={24} color="#ffffff" />
          </Pressable>
        </View>
      ) : pollComposerOpen ? (
        <View style={styles.pollComposer}>
          <TextInput
            style={styles.input}
            placeholder="Ask a question..."
            placeholderTextColor={COLORS.textPlaceholder}
            value={pollQuestion}
            onChangeText={setPollQuestion}
            maxLength={500}
          />
          {pollOptions.map((option, index) => (
            <TextInput
              key={index}
              style={styles.pollOptionInput}
              placeholder={`Option ${index + 1}`}
              placeholderTextColor={COLORS.textPlaceholder}
              value={option}
              onChangeText={(text) => {
                const next = [...pollOptions];
                next[index] = text;
                setPollOptions(next);
              }}
              maxLength={200}
            />
          ))}
          <Pressable onPress={() => setPollOptions([...pollOptions, ''])}>
            <Text style={styles.pollAddOption}>+ Add option</Text>
          </Pressable>
          <View style={styles.pollActions}>
            <Pressable onPress={() => setPollComposerOpen(false)}>
              <Text style={styles.pollActionText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.sendButton, (!pollQuestion.trim() || pollOptions.filter(Boolean).length < 2 || sendingPoll) && styles.sendButtonDisabled]}
              onPress={sendPoll}
              disabled={!pollQuestion.trim() || pollOptions.filter(Boolean).length < 2 || sendingPoll}
            >
              <Text style={styles.sendText}>Send poll</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          {replyingTo ? (
            <View style={styles.replyComposerBar}>
              <View style={styles.replyComposerLine} />
              <View style={styles.replyComposerContent}>
                <Text style={styles.replyComposerLabel}>Replying to {senderProfiles[replyingTo.senderUid]?.displayName || senderProfiles[replyingTo.senderUid]?.username || 'message'}</Text>
                <Text style={styles.replyComposerSnippet} numberOfLines={1}>{replyingTo.text || replyingTo.question || 'Attachment'}</Text>
              </View>
              <Pressable onPress={() => setReplyingTo(null)}>
                <Ionicons name="close" size={20} color={COLORS.textMuted} />
              </Pressable>
            </View>
          ) : null}
          <View style={styles.composer}>
            <Pressable onPress={showAttachmentMenu} style={styles.attachButton}>
              <Ionicons name="attach" size={22} color={COLORS.textMuted} />
            </Pressable>
          <TextInput
            style={styles.input}
            placeholder="Message..."
            placeholderTextColor={COLORS.textPlaceholder}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={2000}
          />
          <Pressable
            style={[styles.sendButton, (!text.trim() || sending || sendingPhotos) && styles.sendButtonDisabled]}
            onPress={send}
            disabled={!text.trim() || sending || sendingPhotos}
          >
            <Text style={styles.sendText}>Send</Text>
          </Pressable>
        </View>
      </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bgCard,
  },
  backButton: { padding: 4 },
  headerTitleArea: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: COLORS.accent, fontWeight: '800', fontSize: 15 },
  title: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800', flex: 1 },
  messagesContent: { padding: 16, gap: 8 },
  emptyContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  emptyCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.bgCard,
    padding: 24,
    alignItems: 'center',
  },
  notFoundCard: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  emptyBody: { color: COLORS.textSecondary, fontSize: 14, marginTop: 8, textAlign: 'center' },
  messageRow: { flexDirection: 'row' },
  messageRowMine: { justifyContent: 'flex-end' },
  messageRowTheirs: { justifyContent: 'flex-start' },
  messageStack: { maxWidth: '78%' },
  messageStackMine: { alignItems: 'flex-end' },
  messageStackTheirs: { alignItems: 'flex-start' },
  senderLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700', marginBottom: 4, marginLeft: 6 },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: { backgroundColor: COLORS.accent },
  bubbleTheirs: { backgroundColor: COLORS.bgElevated },
  messageText: { fontSize: 15, lineHeight: 20 },
  messageTextMine: { color: '#ffffff' },
  messageTextTheirs: { color: COLORS.textPrimary },
  messageActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4, paddingHorizontal: 6 },
  messageActionsMine: { justifyContent: 'flex-end' },
  messageActionsTheirs: { justifyContent: 'flex-start' },
  messageActionText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700' },
  messageActionDanger: { color: COLORS.danger, fontSize: 11, fontWeight: '800' },
  venueLinkCard: {
    width: 260,
    borderRadius: 18,
    padding: 10,
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
  },
  venueLinkCardMine: {
    backgroundColor: COLORS.bgElevated,
    borderColor: COLORS.accent,
  },
  venueLinkCardTheirs: {
    backgroundColor: COLORS.bgElevated,
    borderColor: COLORS.bgCard,
  },
  venueLinkThumb: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  venueLinkCopy: { flex: 1, minWidth: 0 },
  venueLinkLabel: { color: COLORS.accent, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  venueLinkName: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '800', marginTop: 2 },
  venueLinkMeta: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700', marginTop: 2 },
  venueLinkAddress: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  reviewLinkCard: {
    width: 260,
    borderRadius: 18,
    padding: 10,
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
  },
  reviewLinkCardMine: {
    backgroundColor: COLORS.bgElevated,
    borderColor: COLORS.accent,
  },
  reviewLinkCardTheirs: {
    backgroundColor: COLORS.bgElevated,
    borderColor: COLORS.bgCard,
  },
  reviewLinkThumb: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewLinkCopy: { flex: 1, minWidth: 0 },
  reviewLinkHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reviewLinkLabel: { color: COLORS.accent, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  unlistedTag: {
    color: COLORS.danger,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    backgroundColor: 'rgba(239,68,68,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  reviewLinkVenue: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '800', marginTop: 2 },
  reviewLinkSentiment: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  reviewLinkAuthor: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  reviewLinkNotes: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2, lineHeight: 14 },
  composer: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.bgCard,
    backgroundColor: COLORS.bg,
  },
  attachButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgElevated,
  },
  photoBubble: {
    maxWidth: 240,
    borderRadius: 18,
    overflow: 'hidden',
  },
  photoBubbleMine: {
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  photoBubbleTheirs: {
    borderWidth: 1,
    borderColor: COLORS.bgCard,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgElevated,
  },
  photoImage: {
    width: 240,
    borderRadius: 14,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    width: 240,
  },
  photoGridItem: {
    width: 118,
    borderRadius: 10,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    borderRadius: 18,
    backgroundColor: COLORS.bgElevated,
    color: COLORS.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  sendButton: {
    minHeight: 44,
    borderRadius: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
  },
  sendButtonDisabled: { opacity: 0.5 },
  sendText: { color: '#ffffff', fontWeight: '800' },
  pollComposer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.bgCard,
    backgroundColor: COLORS.bg,
    gap: 10,
  },
  pollOptionInput: {
    borderRadius: 12,
    backgroundColor: COLORS.bgElevated,
    color: COLORS.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  pollAddOption: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  pollActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  pollActionText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  pollCard: {
    width: 260,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
  },
  pollCardMine: {
    backgroundColor: COLORS.bgElevated,
    borderColor: COLORS.accent,
  },
  pollCardTheirs: {
    backgroundColor: COLORS.bgElevated,
    borderColor: COLORS.bgCard,
  },
  pollQuestion: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  pollOption: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.bg,
    marginBottom: 6,
  },
  pollOptionText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  locationCard: {
    width: 240,
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
  },
  locationCardMine: {
    backgroundColor: COLORS.bgElevated,
    borderColor: COLORS.accent,
  },
  locationCardTheirs: {
    backgroundColor: COLORS.bgElevated,
    borderColor: COLORS.bgCard,
  },
  locationCopy: { flex: 1, minWidth: 0 },
  locationLabel: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  locationCoords: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  voiceRecordingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.bgCard,
    backgroundColor: COLORS.bg,
  },
  voiceRecordingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  voiceRecordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.danger,
  },
  voiceRecordingText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  voiceRecordingStop: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 4,
    maxWidth: '78%',
  },
  replyPreviewMine: {
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  replyPreviewTheirs: {
    backgroundColor: COLORS.bgCard,
  },
  replyPreviewLine: {
    width: 3,
    height: 28,
    borderRadius: 2,
    backgroundColor: COLORS.accent,
  },
  replyPreviewContent: {
    flex: 1,
    minWidth: 0,
  },
  replyPreviewSender: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '800',
  },
  replyPreviewSnippet: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  reactionsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 6,
  },
  reactionsBarMine: {
    justifyContent: 'flex-end',
  },
  reactionsBarTheirs: {
    justifyContent: 'flex-start',
  },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.bgCard,
  },
  reactionPillSelf: {
    borderColor: COLORS.accent,
    backgroundColor: 'rgba(59,130,246,0.1)',
  },
  reactionEmoji: {
    fontSize: 16,
  },
});
