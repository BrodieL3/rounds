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
import GlassBackButton from '../../components/ui/GlassBackButton';
import { COLORS } from '../../lib/constants';
import { db, storage } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import useConversationSurface from '../../hooks/useConversationSurface';
import MessageList from '../../components/conversation/MessageList';
import MessageBubble from '../../components/conversation/MessageBubble';
import Composer from '../../components/conversation/Composer';
import AttachmentPanel from '../../components/conversation/panels/AttachmentPanel';

const HEADER_CONTENT_HEIGHT = 60;

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

  // Back: pop the stack when there's history, otherwise fall back to the inbox. Deep links /
  // dev reloads can land here with no back stack, where router.back() is a no-op.
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/friends');
  };

  // Tapping the header profile opens group info for a group, or the other person's Rounds
  // profile for a DM.
  const otherUsername = surface.otherUser?.username;
  const canOpenProfile = isGroup ? !!surface.conversationId : !!otherUsername;
  const openProfile = () => {
    if (isGroup) {
      openGroupInfo();
      return;
    }
    if (otherUsername) {
      router.push({ pathname: '/user/[username]', params: { username: otherUsername } });
    }
  };

  if (surface.notFound) {
    return (
      <View style={styles.screen}>
        <View style={styles.notFoundCard}>
          <Text style={styles.emptyTitle}>Conversation not found</Text>
          <Pressable onPress={goBack} style={styles.sendButton}>
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

      {/* iMessage-style floating controls — no solid header bar. The back button and the
          profile float as individual liquid-glass elements over the message list. */}
      <View
        style={[styles.headerArea, { height: headerHeight, paddingTop: insets.top }]}
        pointerEvents="box-none"
      >
        <GlassBackButton onPress={goBack} style={styles.backFloating} />
        <Pressable
          onPress={openProfile}
          disabled={!canOpenProfile}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
        >
          <BlurView tint="dark" intensity={60} style={styles.profilePill}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{surface.title.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.title} numberOfLines={1}>{surface.title}</Text>
            {isGroup ? <AppIcon name="chevron-forward" size={12} color={COLORS.textMuted} /> : null}
          </BlurView>
        </Pressable>
      </View>

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
  headerArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingBottom: 8,
  },
  backFloating: { position: 'absolute', left: 10, bottom: 8 },
  profilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: 240,
    paddingLeft: 5,
    paddingRight: 14,
    paddingVertical: 5,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: COLORS.accent, fontWeight: '800', fontSize: 13 },
  title: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700', maxWidth: 170 },
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
