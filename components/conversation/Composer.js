import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AppIcon from '../ui/AppIcon';
import { COLORS } from '../../lib/constants';
import { formatVoiceDuration } from '../../lib/friends/conversation-surface';

export default function Composer({
  text,
  setText,
  sending,
  sendingPhotos,
  onSend,
  onAttach,
  replyingTo,
  onCancelReply,
  senderProfiles,
  voiceRecording,
  voiceRecordElapsed,
  onStopRecording,
  pollComposerOpen,
  pollQuestion,
  setPollQuestion,
  pollOptions,
  setPollOptions,
  pollAllowMultiple,
  setPollAllowMultiple,
  sendingPoll,
  onSendPoll,
  onClosePollComposer,
}) {
  if (voiceRecording) {
    return (
      <View style={styles.voiceRecordingOverlay}>
        <View style={styles.voiceRecordingRow}>
          <View style={styles.voiceRecordingDot} />
          <Text style={styles.voiceRecordingText}>
            Recording {formatVoiceDuration(voiceRecordElapsed)}
          </Text>
        </View>
        <Pressable onPress={onStopRecording} style={styles.voiceRecordingStop}>
          <AppIcon name="stop" size={24} color="#ffffff" />
        </Pressable>
      </View>
    );
  }

  if (pollComposerOpen) {
    return (
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
            onChangeText={(txt) => {
              const next = [...pollOptions];
              next[index] = txt;
              setPollOptions(next);
            }}
            maxLength={200}
          />
        ))}
        <Pressable onPress={() => setPollOptions([...pollOptions, ''])}>
          <Text style={styles.pollAddOption}>+ Add option</Text>
        </Pressable>
        <View style={styles.pollActions}>
          <Pressable onPress={onClosePollComposer}>
            <Text style={styles.pollActionText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.sendButton, (!pollQuestion.trim() || pollOptions.filter(Boolean).length < 2 || sendingPoll) && styles.sendButtonDisabled]}
            onPress={onSendPoll}
            disabled={!pollQuestion.trim() || pollOptions.filter(Boolean).length < 2 || sendingPoll}
          >
            <Text style={styles.sendText}>Send poll</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <>
      {replyingTo ? (
        <View style={styles.replyComposerBar}>
          <View style={styles.replyComposerLine} />
          <View style={styles.replyComposerContent}>
            <Text style={styles.replyComposerLabel}>
              Replying to {senderProfiles[replyingTo.senderUid]?.displayName || senderProfiles[replyingTo.senderUid]?.username || 'message'}
            </Text>
            <Text style={styles.replyComposerSnippet} numberOfLines={1}>
              {replyingTo.text || replyingTo.question || 'Attachment'}
            </Text>
          </View>
          <Pressable onPress={onCancelReply}>
            <AppIcon name="close" size={20} color={COLORS.textMuted} />
          </Pressable>
        </View>
      ) : null}
      <View style={styles.composer}>
        <Pressable onPress={onAttach} style={styles.attachButton}>
          <AppIcon name="attach" size={22} color={COLORS.textMuted} />
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
          onPress={onSend}
          disabled={!text.trim() || sending || sendingPhotos}
        >
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
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
  replyComposerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.bgCard,
    backgroundColor: COLORS.bg,
  },
  replyComposerLine: {
    width: 3,
    height: 28,
    borderRadius: 2,
    backgroundColor: COLORS.accent,
  },
  replyComposerContent: {
    flex: 1,
    minWidth: 0,
  },
  replyComposerLabel: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '800',
  },
  replyComposerSnippet: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
});
