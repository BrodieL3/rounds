import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, COHORT_LABELS } from '../../lib/constants';
import { db } from '../../lib/firebase';
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
  }, [conversationId, recipientUid, conversationReloadKey]);

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
      if (conversation?.type === 'group') {
        await sendGroupTextMessage({ db, conversation, senderUid: user.uid, text: normalized });
      } else {
        await sendDirectTextMessage({
          db,
          senderUid: user.uid,
          recipientUid,
          text: normalized,
        });
        setConversationReloadKey((key) => key + 1);
      }
      setText('');
    } catch (err) {
      Alert.alert('Message failed', err.message);
    } finally {
      setSending(false);
    }
  }, [conversation, isGroup, recipientUid, sending, text, user]);

  const renderMessage = ({ item }) => {
    const isMine = item.senderUid === user?.uid;
    const sender = senderProfiles[item.senderUid];
    const senderLabel = isGroup && !isMine
      ? (sender?.displayName || sender?.username || item.senderUid)
      : null;
    const isVenueLink = item.type === 'venue_link';
    const isReviewLink = item.type === 'review_link';
    const visual = (isVenueLink || isReviewLink) ? getVenueVisualFallback({
      id: item.venueId,
      name: item.venueName,
      cohort: item.venueCohort,
    }) : null;
    const sentimentColor = isReviewLink
      ? (item.sentiment === 'loved' ? COLORS.success : item.sentiment === 'fine' ? COLORS.accent : COLORS.danger)
      : null;

    return (
      <View style={[styles.messageRow, isMine ? styles.messageRowMine : styles.messageRowTheirs]}>
        <View style={[styles.messageStack, isMine ? styles.messageStackMine : styles.messageStackTheirs]}>
          {senderLabel ? <Text style={styles.senderLabel}>{senderLabel}</Text> : null}
          {item.deletedForEveryoneAt ? (
            <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
              <Text style={[styles.messageText, isMine ? styles.messageTextMine : styles.messageTextTheirs]}>
                Message deleted.
              </Text>
            </View>
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
                <Text style={styles.reviewLinkLabel}>Review</Text>
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

      <View style={styles.composer}>
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
          style={[styles.sendButton, (!text.trim() || sending) && styles.sendButtonDisabled]}
          onPress={send}
          disabled={!text.trim() || sending}
        >
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
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
  reviewLinkLabel: { color: COLORS.accent, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
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
});
