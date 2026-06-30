import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../lib/constants';

// Inverted FlatList: the newest message renders at index 0 — the visual BOTTOM — and the list
// is anchored there by construction. The most recent message is always fully visible on open,
// and it stays pinned when the keyboard shrinks the list, with no scrollToEnd timing to get
// wrong. Because the list is flipped, contentContainerStyle.paddingBottom becomes the visual
// TOP inset (clearing the floating header) and paddingTop becomes the visual bottom gap.
export default function MessageList({ messages, renderItem, emptyTitle, emptyBody, topInset = 0 }) {
  const data = useMemo(() => [...messages].reverse(), [messages]);
  const isEmpty = data.length === 0;

  return (
    <FlatList
      inverted={!isEmpty}
      contentInsetAdjustmentBehavior="never"
      data={data}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      style={styles.list}
      contentContainerStyle={
        isEmpty
          ? [styles.emptyContent, { paddingTop: topInset }]
          : [styles.messagesContent, { paddingTop: 12, paddingBottom: topInset + 12 }]
      }
      ListEmptyComponent={(
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{emptyTitle}</Text>
          <Text style={styles.emptyBody}>{emptyBody}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  messagesContent: { paddingHorizontal: 16, gap: 8 },
  emptyContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  emptyCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.bgCard,
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  emptyBody: { color: COLORS.textSecondary, fontSize: 14, marginTop: 8, textAlign: 'center' },
});
