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
import { COLORS } from '../../lib/constants';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';

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

    return (
      <View style={[styles.messageRow, isMine ? styles.messageRowMine : styles.messageRowTheirs]}>
        <View style={[styles.messageStack, isMine ? styles.messageStackMine : styles.messageStackTheirs]}>
          {senderLabel ? <Text style={styles.senderLabel}>{senderLabel}</Text> : null}
          <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
            <Text style={[styles.messageText, isMine ? styles.messageTextMine : styles.messageTextTheirs]}>
              {item.deletedForEveryoneAt ? 'Message deleted.' : item.text}
            </Text>
          </View>
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
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{title.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
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
