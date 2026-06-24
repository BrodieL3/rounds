import { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import AppIcon from '../../components/ui/AppIcon';
import { COLORS } from '../../lib/constants';
import { db, storage } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import useConversationSurface from '../../hooks/useConversationSurface';
import MessageList from '../../components/conversation/MessageList';
import MessageBubble from '../../components/conversation/MessageBubble';
import Composer from '../../components/conversation/Composer';
import AttachmentPanel from '../../components/conversation/panels/AttachmentPanel';

const HEADER_CONTENT_HEIGHT = 64;

export default function ConversationScreen() {
  const { id, otherUid } = useLocalSearchParams();
  const { user } = useAuth();
  const surface = useConversationSurface({
    conversationId: Array.isArray(id) ? id[0] : id,
    recipientUid: Array.isArray(otherUid) ? otherUid[0] : otherUid,
    user,
  });

  const isGroup = surface.isGroup;

  // When the keyboard is down, dock the composer above the bottom safe-area inset so the
  // buttons rest in a natural spot instead of crowding the home indicator. When the keyboard
  // is up, KeyboardAvoidingView already lifts it, so collapse the extra inset to 0.
  const insets = useSafeAreaInsets();
  const headerHeight = insets.top + HEADER_CONTENT_HEIGHT;
  const [keyboardShown, setKeyboardShown] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(291);
  // Which attachment panel (if any) is replacing the keyboard: null | photo | poll | voice | venue.
  const [activePanel, setActivePanel] = useState(null);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => {
      setKeyboardShown(true);
      // Note: do NOT close the active panel here — the poll/venue panels summon the keyboard
      // for their own text inputs. The message input closes panels via onFocusInput instead.
      const height = e?.endCoordinates?.height;
      if (height) setKeyboardHeight(height);
    });
    const hide = Keyboard.addListener(hideEvt, () => setKeyboardShown(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  // Composer docks above the safe area only when neither the keyboard nor a panel is present;
  // an open panel already fills the bottom of the screen (it's keyboard-height).
  const composerBottomInset = (keyboardShown || activePanel) ? 0 : insets.bottom;

  const selectAttachment = (key) => {
    setActivePanel(key);
    Keyboard.dismiss();
  };
  const closePanel = () => setActivePanel(null);

  const openGroupInfo = () => {
    if (!isGroup || !surface.conversationId) return;
    router.push({ pathname: '/conversation/[id]/info', params: { id: surface.conversationId } });
  };

  if (surface.notFound) {
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
      <MessageList
        topInset={headerHeight}
        messages={surface.messages}
        emptyTitle={surface.emptyTitle}
        emptyBody={surface.emptyBody}
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            isMine={item.senderUid === user?.uid}
            isGroup={isGroup}
            sender={surface.senderProfiles[item.senderUid]}
            photoUrls={surface.photoUrls[item.id]}
            reactions={surface.messageReactions[item.id]}
            senderProfiles={surface.senderProfiles}
            user={user}
            conversationId={surface.conversationId}
            db={db}
            storage={storage}
            onToggleReaction={surface.toggleMessageReaction}
            onReply={surface.setReplyingTo}
            onHide={surface.hideMessage}
            onDeleteForEveryone={surface.deleteForEveryone}
            onReport={surface.reportMessage}
            onVotePoll={surface.votePoll}
          />
        )}
      />

      {/* Floating "liquid glass" header: centered avatar + name, back button only (no call button).
          It sits in front of the list so messages scroll translucently beneath it. */}
      <BlurView
        intensity={48}
        tint="dark"
        style={[styles.header, { height: headerHeight, paddingTop: insets.top }]}
      >
        <Pressable
          style={styles.headerCenter}
          onPress={openGroupInfo}
          disabled={!isGroup}
          accessibilityRole={isGroup ? 'button' : undefined}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{surface.title.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.headerNameRow}>
            <Text style={styles.title} numberOfLines={1}>{surface.title}</Text>
            {isGroup ? <AppIcon name="chevron-forward" size={12} color={COLORS.textMuted} /> : null}
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backButton}
        >
          <AppIcon name="chevron-back" size={28} color={COLORS.accent} />
        </Pressable>
      </BlurView>

      <Composer
        text={surface.text}
        setText={surface.setText}
        sending={surface.sending}
        sendingPhotos={surface.sendingPhotos}
        onSend={surface.send}
        bottomInset={composerBottomInset}
        isGroup={isGroup}
        onSelectAttachment={selectAttachment}
        onFocusInput={closePanel}
        replyingTo={surface.replyingTo}
        onCancelReply={() => surface.setReplyingTo(null)}
        senderProfiles={surface.senderProfiles}
      />

      <AttachmentPanel
        activePanel={activePanel}
        height={keyboardHeight}
        photo={{
          onSendPhotos: async (photos) => { await surface.sendPhotoAssets(photos); closePanel(); },
          sending: surface.sendingPhotos,
        }}
        poll={{
          pollQuestion: surface.pollQuestion,
          setPollQuestion: surface.setPollQuestion,
          pollOptions: surface.pollOptions,
          setPollOptions: surface.setPollOptions,
          pollAllowMultiple: surface.pollAllowMultiple,
          setPollAllowMultiple: surface.setPollAllowMultiple,
          sendingPoll: surface.sendingPoll,
          onSendPoll: async () => { await surface.sendPoll(); closePanel(); },
        }}
        voice={{
          recording: !!surface.voiceRecording,
          elapsedMs: surface.voiceRecordElapsed,
          onStartRecord: surface.startRecording,
          onStopRecord: async () => { await surface.stopRecordingAndSend(); closePanel(); },
        }}
        venue={{
          onSendVenue: async ({ venue, cityKey }) => { await surface.sendVenueLink({ venue, cityKey }); closePanel(); },
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    overflow: 'hidden',
  },
  headerCenter: { alignItems: 'center', gap: 3 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: COLORS.accent, fontWeight: '800', fontSize: 16 },
  headerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  title: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700', maxWidth: 220 },
  backButton: {
    position: 'absolute',
    left: 8,
    bottom: 6,
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notFoundCard: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  sendButton: {
    minHeight: 44,
    borderRadius: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
  },
  sendText: { color: '#ffffff', fontWeight: '800' },
});
