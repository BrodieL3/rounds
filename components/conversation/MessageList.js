import { FlatList, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../lib/constants';

export default function MessageList({ messages, renderItem, emptyTitle, emptyBody }) {
  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      data={messages}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={messages.length === 0 ? styles.emptyContent : styles.messagesContent}
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
  messagesContent: { padding: 16, gap: 8 },
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
