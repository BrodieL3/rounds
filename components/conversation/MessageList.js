import { useRef } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../lib/constants';

export default function MessageList({ messages, renderItem, emptyTitle, emptyBody, topInset = 0 }) {
  const listRef = useRef(null);
  const hasOpenedAtBottom = useRef(false);
  const nearBottom = useRef(true);

  const scrollToEnd = (animated) => listRef.current?.scrollToEnd({ animated });

  return (
    <FlatList
      ref={listRef}
      style={styles.list}
      contentInsetAdjustmentBehavior="never"
      data={messages}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[
        messages.length === 0 ? styles.emptyContent : styles.messagesContent,
        { paddingTop: topInset + (messages.length === 0 ? 0 : 12) },
      ]}
      scrollEventThrottle={16}
      onScroll={(event) => {
        const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
        const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
        nearBottom.current = distanceFromBottom < 120;
      }}
      onContentSizeChange={() => {
        // Open pinned to the newest message; after that, only stick to the bottom when the
        // viewer is already there so incoming messages / keyboard toggles don't yank them up.
        if (!hasOpenedAtBottom.current) {
          scrollToEnd(false);
          hasOpenedAtBottom.current = true;
        } else if (nearBottom.current) {
          scrollToEnd(false);
        }
      }}
      onLayout={() => {
        // Initial open jumps to the newest message. Later layout changes — chiefly the
        // keyboard showing after the composer auto-focuses, which shrinks the list — re-pin to
        // the bottom when the viewer is already there, so the newest message stays fully
        // visible above the composer instead of hiding behind the keyboard.
        if (!hasOpenedAtBottom.current && messages.length > 0) {
          scrollToEnd(false);
        } else if (nearBottom.current) {
          scrollToEnd(false);
        }
      }}
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
  messagesContent: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
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
