import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AppIcon from '../../ui/AppIcon';
import { COLORS } from '../../../lib/constants';

// Poll composer as a keyboard-height panel (group chats only). Lives here instead of the
// bottom of the Composer so it has room to breathe and starts at the top of the panel.
export default function PollPanel({
  pollQuestion,
  setPollQuestion,
  pollOptions,
  setPollOptions,
  pollAllowMultiple,
  setPollAllowMultiple,
  sendingPoll,
  onSendPoll,
}) {
  const canSend = pollQuestion.trim() && pollOptions.filter(Boolean).length >= 2 && !sendingPoll;

  return (
    <View style={styles.panel}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>New poll</Text>
        <TextInput
          style={styles.questionInput}
          placeholder="Ask a question..."
          placeholderTextColor={COLORS.textPlaceholder}
          value={pollQuestion}
          onChangeText={setPollQuestion}
          maxLength={500}
        />
        {pollOptions.map((option, index) => (
          <TextInput
            key={index}
            style={styles.optionInput}
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
        <Pressable style={styles.addOption} onPress={() => setPollOptions([...pollOptions, ''])}>
          <AppIcon name="add" size={16} color={COLORS.accent} />
          <Text style={styles.addOptionText}>Add option</Text>
        </Pressable>
        <Pressable style={styles.multiRow} onPress={() => setPollAllowMultiple(!pollAllowMultiple)}>
          <View style={[styles.checkbox, pollAllowMultiple && styles.checkboxOn]}>
            {pollAllowMultiple ? <AppIcon name="checkmark" size={14} color={COLORS.onAccent} /> : null}
          </View>
          <Text style={styles.multiLabel}>Allow multiple answers</Text>
        </Pressable>
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        style={[styles.sendButton, !canSend && styles.disabled]}
        onPress={onSendPoll}
        disabled={!canSend}
      >
        <Text style={styles.sendText}>Send poll</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1, paddingHorizontal: 16, paddingTop: 14 },
  scroll: { gap: 10, paddingBottom: 12 },
  heading: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: 2 },
  questionInput: {
    backgroundColor: COLORS.bgElevated,
    color: COLORS.textPrimary,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '700',
  },
  optionInput: {
    backgroundColor: COLORS.bgElevated,
    color: COLORS.textPrimary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  addOption: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 2 },
  addOptionText: { color: COLORS.accent, fontSize: 14, fontWeight: '700' },
  multiRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  multiLabel: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  sendButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginVertical: 12,
  },
  disabled: { opacity: 0.5 },
  sendText: { color: COLORS.onAccent, fontWeight: '800', fontSize: 15 },
});
