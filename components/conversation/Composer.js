import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useEffect, useRef } from 'react';
import AppIcon from '../ui/AppIcon';
import AttachmentMenu from './AttachmentMenu';
import { COLORS } from '../../lib/constants';

// The persistent input row: attach menu, text field, send button. Attachment flows (photo,
// poll, voice, venue) render in keyboard-height panels below this row, not inside it.
export default function Composer({
  text,
  setText,
  sending,
  sendingPhotos,
  onSend,
  bottomInset = 0,
  isGroup = false,
  onSelectAttachment,
  onFocusInput,
  replyingTo,
  onCancelReply,
  senderProfiles,
}) {
  const inputRef = useRef(null);
  // Raise the keyboard when the conversation opens. autoFocus alone can miss after a
  // navigation transition, so also focus via ref once the screen settles.
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

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
      <View style={[styles.composer, { paddingBottom: Math.max(12, bottomInset) }]}>
        <AttachmentMenu isGroup={isGroup} onSelect={onSelectAttachment} />
        <View style={styles.messageInputWrap}>
          <TextInput
            ref={inputRef}
            style={styles.messageInput}
            placeholder="Message..."
            placeholderTextColor={COLORS.textPlaceholder}
            value={text}
            onChangeText={setText}
            onFocus={onFocusInput}
            multiline
            maxLength={2000}
            autoFocus
          />
        </View>
        {text.trim() ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send"
            style={[styles.sendCircle, (sending || sendingPhotos) && styles.sendButtonDisabled]}
            onPress={onSend}
            disabled={sending || sendingPhotos}
          >
            <AppIcon name="chat.send" focused size={22} color={COLORS.onAccent} />
          </Pressable>
        ) : null}
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
    backgroundColor: COLORS.bg,
  },
  messageInputWrap: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 18,
    backgroundColor: COLORS.bgElevated,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  messageInput: {
    color: COLORS.textPrimary,
    fontSize: 15,
    paddingVertical: 8,
    margin: 0,
    textAlignVertical: 'center',
  },
  sendCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
  },
  sendButtonDisabled: { opacity: 0.5 },
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
