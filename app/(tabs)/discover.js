import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AppIcon from '../../components/ui/AppIcon';
import { router } from 'expo-router';
import {
  collection, doc, limit, onSnapshot, query, updateDoc, where,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, COHORT_LABELS } from '../../lib/constants';
import MediaImage from '../../components/ui/media-image';
import VenueRow from '../../components/VenueRow';

const { buildFeedItemDisplay } = require('../../lib/feed-display');
const {
  buildPostBookmarkUpdate,
  buildPostLikeUpdate,
  buildReviewShareParams,
  isPostBookmarkedBy,
  isPostLikedBy,
} = require('../../lib/feed-engagement');
const { getMediaReferences, resolveMediaReferencesAsync } = require('../../lib/media-display');
const { buildFeedViewItems, createSeedVenueLookup } = require('../../lib/feed-view-model');
const { buildVenueCatalog, getAttribution } = require('../../lib/venue-catalog');
const venueSeed = require('../../assets/venues.json');

const AVATAR_SIZE = 44;
const PLACEHOLDER_AVATAR = 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=160&h=160&fit=crop&crop=faces';
const VENUES_BY_CITY = createSeedVenueLookup(venueSeed);

function getAvatarUri(item) {
  return item.photoURL
    || item.avatarURL
    || item.userPhotoURL
    || item.profilePhotoURL
    || item.authorPhotoURL
    || (item.userId ? `https://i.pravatar.cc/160?u=${encodeURIComponent(item.userId)}` : PLACEHOLDER_AVATAR);
}

function ActionIcon({ name, activeName, active, color, onPress, disabled, accessibilityLabel }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={(event) => {
        event.stopPropagation?.();
        onPress?.();
      }}
      disabled={disabled}
      hitSlop={8}
      style={disabled ? styles.actionDisabled : null}
    >
      <AppIcon
        name={active ? activeName : name}
        size={24}
        color={active ? color : COLORS.textPrimary}
      />
    </Pressable>
  );
}

function IconRow({
  liked,
  bookmarked,
  onLikePress,
  onCommentPress,
  onSharePress,
  onBookmarkPress,
  disabledAction,
}) {
  const disabled = Boolean(disabledAction);
  return (
    <View style={styles.actionsRow}>
      <View style={styles.actionsLeft}>
        <ActionIcon
          name="heart-outline"
          activeName="heart"
          active={liked}
          color={COLORS.danger}
          onPress={onLikePress}
          disabled={disabled}
          accessibilityLabel={liked ? 'Unlike review' : 'Like review'}
        />
        <ActionIcon
          name="chatbubble-outline"
          activeName="chatbubble"
          onPress={onCommentPress}
          disabled={disabled}
          accessibilityLabel="Comment on review"
        />
        <ActionIcon
          name="paper-plane-outline"
          activeName="paper-plane"
          onPress={onSharePress}
          disabled={disabled}
          accessibilityLabel="Share review"
        />
      </View>
      <View style={styles.actionsRight}>
        <ActionIcon
          name="bookmark-outline"
          activeName="bookmark"
          active={bookmarked}
          color={COLORS.accent}
          onPress={onBookmarkPress}
          disabled={disabled}
          accessibilityLabel={bookmarked ? 'Unsave review' : 'Save review'}
        />
      </View>
    </View>
  );
}

// Social feed row — preserved for the eventual social slice. Not the primary
// beta surface (a zero-post user has no feed), but kept intact so the existing
// feed-engagement/share wiring and its suites (feed-actions-ui) stay green.
export function DiscoverItem({ item, city, currentUserId }) {
  const display = buildFeedItemDisplay(item, city);
  const mediaRefs = getMediaReferences(item);
  const [media, setMedia] = useState([]);
  const [pendingAction, setPendingAction] = useState(null);
  const liked = isPostLikedBy(item, currentUserId);
  const bookmarked = isPostBookmarkedBy(item, currentUserId);

  useEffect(() => {
    let canceled = false;
    resolveMediaReferencesAsync(mediaRefs)
      .then((resolved) => {
        if (!canceled) setMedia(resolved);
      })
      .catch(() => {
        if (!canceled) setMedia([]);
      });
    return () => {
      canceled = true;
    };
  }, [JSON.stringify(mediaRefs)]);

  const updateEngagement = async (action, buildUpdate) => {
    if (!currentUserId || pendingAction) return;
    setPendingAction(action);
    try {
      await updateDoc(doc(db, 'posts', item.id), buildUpdate(item, currentUserId));
    } catch (err) {
      Alert.alert('Action failed', err.message);
    } finally {
      setPendingAction(null);
    }
  };

  const openPost = () => router.push(`/post/${item.id}`);

  const sharePost = () => {
    router.push({
      pathname: '/conversation/share-review',
      params: buildReviewShareParams(item),
    });
  };

  return (
    <Pressable style={styles.feedItem} onPress={openPost}>
      <View style={styles.headerRow}>
        <MediaImage source={{ uri: getAvatarUri(item) }} style={styles.avatar} />

        <View style={styles.headerCopy}>
          <Text style={styles.activitySentence}>
            <Text style={styles.activityStrong}>{display.activity.actor}</Text>
            <Text> {display.activity.verb} </Text>
            <Text style={styles.activityStrong}>{display.activity.venue}</Text>
          </Text>
          <Text style={styles.metadata}>{display.metadata}</Text>
        </View>

        {display.ratingBadge ? (
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>{display.ratingBadge}</Text>
          </View>
        ) : null}
      </View>

      {media.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          contentContainerStyle={styles.mediaScroller}
        >
          {media.map((url, index) => (
            <MediaImage key={`${url}-${index}`} source={{ uri: url }} style={styles.mediaImage} />
          ))}
        </ScrollView>
      ) : null}

      {display.notes ? (
        <Text style={styles.notes}>
          <Text style={styles.notesLabel}>Notes: </Text>
          {display.notes}
        </Text>
      ) : null}

      <View style={styles.metricsRow}>
        <Text style={styles.metricText}>{display.engagement.likes}</Text>
        <Text style={styles.metricText}>{display.engagement.bookmarks}</Text>
      </View>

      <IconRow
        liked={liked}
        bookmarked={bookmarked}
        onLikePress={() => updateEngagement('like', buildPostLikeUpdate)}
        onCommentPress={openPost}
        onSharePress={sharePost}
        onBookmarkPress={() => updateEngagement('bookmark', buildPostBookmarkUpdate)}
        disabledAction={pendingAction}
      />
    </Pressable>
  );
}

// Tappable search affordance that hands off to the dedicated venue search.
function SearchBar() {
  return (
    <Pressable
      style={styles.searchBar}
      onPress={() => router.push('/search')}
      accessibilityRole="button"
      accessibilityLabel="Search bars by name"
    >
      <AppIcon name="search" size={18} color={COLORS.textMuted} />
      <Text style={styles.searchBarText}>Search bars by name, area, or type</Text>
    </Pressable>
  );
}

export default function DiscoverScreen() {
  const { user, profile } = useAuth();
  // The browsable seeded catalog IS the beta discovery surface: a brand-new
  // user with ZERO posts and ZERO friends can still scroll real bars and tap
  // into one to log it (parent ISA ISC-24/54). The catalog renders from the
  // bundled OSM seed and never gates on profile.city (onboarding doesn't set
  // one for the single Boston+Cambridge beta pool).
  const sections = useMemo(() => buildVenueCatalog(venueSeed), []);
  const attribution = getAttribution(venueSeed);

  // Social posts stay subscribed-to so the feed lights up once activity exists,
  // but they are not the cold-start surface and do not block browsing.
  const [, setPosts] = useState([]);

  useEffect(() => {
    if (!user || !profile?.city) return undefined;

    const cityQ = query(
      collection(db, 'posts'),
      where('city', '==', profile.city),
      limit(50)
    );

    const unsub = onSnapshot(cityQ, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPosts(buildFeedViewItems({
        posts: items,
        city: profile.city,
        following: profile?.following || [],
        venueLookup: VENUES_BY_CITY,
      }));
    }, (err) => {
      console.error('Discover snapshot error:', err);
    });

    return unsub;
  }, [user, profile?.city, profile?.following]);

  const totalVenues = sections.reduce((sum, section) => sum + section.count, 0);

  return (
    <View style={styles.screen}>
      <SectionList
        contentInsetAdjustmentBehavior="automatic"
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <VenueRow
            item={item}
            cityKey={item.cityKey}
            actionMode="discovery"
            onPress={() => router.push(`/venue/${item.id}`)}
          />
        )}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionCount}>{section.count} bars</Text>
          </View>
        )}
        ListHeaderComponent={(
          <View style={styles.header}>
            <Text style={styles.title}>Discover</Text>
            <Text style={styles.subtitle}>{totalVenues} bars near you — tap one to log a visit</Text>
            <SearchBar />
          </View>
        )}
        ListFooterComponent={(
          <Text style={styles.attribution}>{attribution}</Text>
        )}
        ListEmptyComponent={(
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No bars loaded yet</Text>
            <Text style={styles.emptySub}>Pull to refresh or try search.</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 20, paddingTop: 8 },
  title: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.bgElevated,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  searchBarText: { color: COLORS.textMuted, fontSize: 15, fontWeight: '500' },
  listContent: { paddingHorizontal: 20, paddingBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 6,
    backgroundColor: COLORS.bg,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  sectionCount: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  attribution: {
    color: COLORS.textMuted,
    fontSize: 11,
    lineHeight: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  // Social feed styles (preserved with the DiscoverItem component).
  feedItem: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: COLORS.bgElevated,
  },
  headerCopy: { flex: 1, marginLeft: 12, paddingRight: 12 },
  activitySentence: {
    color: COLORS.textPrimary,
    fontSize: 15,
    lineHeight: 21,
  },
  activityStrong: { fontWeight: '800' },
  metadata: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 3,
    lineHeight: 18,
  },
  ratingBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgElevated,
  },
  ratingText: { color: COLORS.accent, fontSize: 16, fontWeight: '800' },
  mediaScroller: { gap: 10, paddingTop: 16, paddingLeft: AVATAR_SIZE + 12 },
  mediaImage: {
    width: 168,
    height: 128,
    borderRadius: 10,
    backgroundColor: COLORS.bgElevated,
  },
  notes: {
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 14,
    marginLeft: AVATAR_SIZE + 12,
  },
  notesLabel: { color: COLORS.textPrimary, fontWeight: '800' },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginLeft: AVATAR_SIZE + 12,
  },
  metricText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginLeft: AVATAR_SIZE + 12,
  },
  actionsLeft: { flexDirection: 'row', gap: 18, alignItems: 'center' },
  actionsRight: { flexDirection: 'row', gap: 18, alignItems: 'center' },
  actionDisabled: { opacity: 0.5 },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyText: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700' },
  emptySub: { color: COLORS.textMuted, fontSize: 14, marginTop: 8, textAlign: 'center' },
});
