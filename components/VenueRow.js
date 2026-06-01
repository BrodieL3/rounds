import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COHORT_LABELS } from '../lib/constants';
import { formatVenueMetadataLines } from '../lib/venue-display';

export default function VenueRow({ item, cityKey, onPress, actionMode }) {
  const hasRank = item.hasPersonalRank && item.personalRank;
  const metadata = formatVenueMetadataLines(
    item,
    COHORT_LABELS[item.cohort] || item.cohort,
    cityKey
  );
  const mode = actionMode || (hasRank ? 'ranked' : 'discovery');
  const title = hasRank ? `${item.personalRank}. ${item.name}` : item.name;

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.copy}>
        <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
          {title}
        </Text>
        {!!metadata.detail && (
          <Text style={styles.meta} numberOfLines={1} ellipsizeMode="tail">
            {metadata.detail}
          </Text>
        )}
        {!!metadata.area && (
          <Text style={styles.meta} numberOfLines={1} ellipsizeMode="tail">
            {metadata.area}
          </Text>
        )}
        {!!metadata.status && (
          <Text style={styles.status} numberOfLines={1} ellipsizeMode="tail">
            {metadata.status}
          </Text>
        )}
      </View>

      {mode === 'ranked' ? (
        <View style={styles.rankAction}>
          <Ionicons name="lock-closed-outline" size={13} color="#9ca3af" />
        </View>
      ) : (
        <View style={styles.discoveryActions}>
          <Ionicons name="add" size={16} color="#6b7280" />
          <Ionicons name="bookmark-outline" size={15} color="#6b7280" />
          <Ionicons name="close" size={16} color="#9ca3af" />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 8,
  },
  copy: {
    flex: 1,
    paddingRight: 12,
  },
  name: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
  },
  meta: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 15,
    marginTop: 1,
  },
  status: {
    color: '#6b7280',
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 14,
    marginTop: 1,
  },
  rankAction: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discoveryActions: {
    width: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
