import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppIcon from '../../components/ui/AppIcon';
import { COLORS } from '../../lib/constants';
import { db, storage } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import useConversationSurface from '../../hooks/useConversationSurface';
import MessageList from '../../components/conversation/MessageList';
import MessageBubble from '../../components/conversation/MessageBubble';
import Composer from '../../components/conversation/Composer';
import showAttachmentMenu from '../../components/conversation/AttachmentMenu';

export default function ConversationScreen() {
  const { id, otherUid } = useLocalSearchParams();
  const { user } = useAuth();
  const surface = useConversationSurface({
    conversationId: Array.isArray(id) ? id[0] : id,
    recipientUid: Array.isArray(otherUid) ? otherUid[0] : otherUid,
    user,
  });

  const isGroup = surface.isGroup;

  const openGroupInfo = () => {
    if (!isGroup || !surface.conversationId) return;
    router.push({ pathname: '/conversation/[id]/info', params: { id: surface.conversationId } });
  };

  const handleAttach = () => {
    showAttachmentMenu({
      onPhoto: surface.sendPhotos,
      onPoll: () => surface.setPollComposerOpen(true),
      onVoice: surface.startRecording,
      onLocation: async () => {
        try {
          const { requestForegroundPermissionsAsync, getCurrentPositionAsync } = await import('expo-location');
          const { status } = await requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            // Permission denied silently; location send won't proceed
            return;
          }
          const { coords } = await getCurrentPositionAsync({});
          await surface.sendLocation({
            lat: coords.latitude,
            lng: coords.longitude,
            label: 'My location',
          });
        } catch (err) {
          // Location send errors handled in hook
        }
      },
    });
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
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.headerSafeArea}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
            <AppIcon name="chevron-back" size={24} color={COLORS.textPrimary} />
          </Pressable>
          <Pressable
            style={styles.headerTitleArea}
            onPress={openGroupInfo}
            disabled={!isGroup}
            accessibilityRole={isGroup ? 'button' : undefined}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{surface.title.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.title}>{surface.title}</Text>
            {isGroup ? <AppIcon name="information-circle-outline" size={22} color={COLORS.textMuted} /> : null}
          </Pressable>
        </View>
      </SafeAreaView>

      <MessageList
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

      <Composer
        text={surface.text}
        setText={surface.setText}
        sending={surface.sending}
        sendingPhotos={surface.sendingPhotos}
        onSend={surface.send}
        onAttach={handleAttach}
        replyingTo={surface.replyingTo}
        onCancelReply={() => surface.setReplyingTo(null)}
        senderProfiles={surface.senderProfiles}
        voiceRecording={surface.voiceRecording}
        voiceRecordElapsed={surface.voiceRecordElapsed}
        onStopRecording={surface.stopRecordingAndSend}
        pollComposerOpen={surface.pollComposerOpen}
        pollQuestion={surface.pollQuestion}
        setPollQuestion={surface.setPollQuestion}
        pollOptions={surface.pollOptions}
        setPollOptions={surface.setPollOptions}
        pollAllowMultiple={surface.pollAllowMultiple}
        setPollAllowMultiple={surface.setPollAllowMultiple}
        sendingPoll={surface.sendingPoll}
        onSendPoll={surface.sendPoll}
        onClosePollComposer={() => surface.setPollComposerOpen(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  headerSafeArea: {
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bgCard,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
