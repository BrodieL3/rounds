import AppIcon from './ui/AppIcon';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, COHORT_LABELS } from '../lib/constants';
import { formatVenueMetadataLines } from '../lib/venue-display';
import { getVenueVisualFallback } from '../lib/venue-visuals';

export default function VenueRow({
  item,
  cityKey,
  onPress,
  actionMode,
  bookmarked,
  onBookmarkPress,
}) {
  const hasRank = item.hasPersonalRank && item.personalRank;
  const metadata = formatVenueMetadataLines(
    item,
    COHORT_LABELS[item.cohort] || item.cohort,
    cityKey
  );
  const mode = actionMode || (hasRank ? 'ranked' : 'discovery');
  const title = hasRank ? `${item.personalRank}. ${item.name}` : item.name;
  const visual = getVenueVisualFallback(item);

  return (
    <Pressable style={styles.row} onPress={onPress}>
      {/* Thumbnail */}
      <View style={[styles.thumb, { backgroundColor: visual.colors[0] }]}>
        <AppIcon name={visual.iconName} size={18} color="#ffffff" />
      </View>

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
          <AppIcon name="lock-closed-outline" size={13} color={COLORS.textMuted} />
        </View>
      ) : (
        <Pressable
          style={styles.bookmarkAction}
          onPress={(e) => {
            e.stopPropagation();
            onBookmarkPress?.(item);
          }}
          hitSlop={8}
        >
          <AppIcon
            name={bookmarked ? 'bookmark' : 'bookmark-outline'}
            size={18}
            color={bookmarked ? COLORS.accent : COLORS.textMuted}
          />
        </Pressable>
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
    borderBottomColor: COLORS.bgCard,
    paddingVertical: 10,
    gap: 12,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  copy: {
    flex: 1,
    paddingRight: 4,
  },
  name: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
  },
  meta: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 15,
    marginTop: 1,
  },
  status: {
    color: COLORS.textMuted,
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
    borderColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookmarkAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
