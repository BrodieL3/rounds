import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  collection, doc, limit, onSnapshot, query, updateDoc, where,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS } from '../../lib/constants';

const { buildFeedItemDisplay, formatElapsedTime } = require('../../lib/feed-display');
const {
  buildPostBookmarkUpdate,
  buildPostLikeUpdate,
  buildReviewShareParams,
  isPostBookmarkedBy,
  isPostLikedBy,
} = require('../../lib/feed-engagement');
const { getMediaReferences, resolveMediaReferencesAsync } = require('../../lib/media-display');
const { getVenueNeighborhood } = require('../../lib/venue-display');
const venueSeed = require('../../assets/venues.json');

const AVATAR_SIZE = 44;
const PLACEHOLDER_AVATAR = 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=160&h=160&fit=crop&crop=faces';
const VENUES_BY_CITY = Object.entries(venueSeed.cities || {}).reduce((cities, [cityKey, city]) => {
  cities[cityKey] = new Map((city.venues || []).map((venue) => [venue.id, venue]));
  return cities;
}, {});

function getSeedVenue(item, cityKey) {
  return VENUES_BY_CITY[cityKey]?.get(item.venueId) || null;
}

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
      <Ionicons
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

export function FeedItem({ item, city, currentUserId }) {
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
        <Image source={{ uri: getAvatarUri(item) }} style={styles.avatar} />

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
            <Image key={`${url}-${index}`} source={{ uri: url }} style={styles.mediaImage} />
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

export default function FeedScreen() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user || !profile?.city) return undefined;

    const cityQ = query(
      collection(db, 'posts'),
      where('city', '==', profile.city),
      limit(50)
    );

    const unsub = onSnapshot(cityQ, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const following = new Set(profile?.following || []);
      const enriched = items.map((p) => {
        const seedVenue = getSeedVenue(p, p.city || profile.city);

        return {
          ...p,
          venueName: p.venueName || seedVenue?.name,
          neighborhood: p.neighborhood || (seedVenue ? getVenueNeighborhood(seedVenue, p.city || profile.city) : null),
          source: following.has(p.userId) ? 'friend' : 'city',
          timeAgo: formatElapsedTime(p.createdAt?.toDate?.() || p.createdAt),
        };
      });

      enriched.sort((a, b) => {
        if (a.source !== b.source) return a.source === 'friend' ? -1 : 1;
        const aTime = a.createdAt?.toDate?.() || a.createdAt || 0;
        const bTime = b.createdAt?.toDate?.() || b.createdAt || 0;
        return new Date(bTime) - new Date(aTime);
      });

      setPosts(enriched);
      setRefreshing(false);
    }, (err) => {
      console.error('Feed snapshot error:', err);
      setRefreshing(false);
    });

    return unsub;
  }, [user, profile?.city, profile?.following]);

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Feed</Text>
      <FlatList
        data={posts}
        renderItem={({ item }) => <FeedItem item={item} city={profile?.city} currentUserId={user?.uid} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => setRefreshing(true)}
            tintColor={COLORS.accent}
          />
        )}
        ListEmptyComponent={(
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No activity yet</Text>
            <Text style={styles.emptySub}>Be the first to rate a venue in your city.</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  title: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    marginTop: 48,
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  listContent: { paddingBottom: 24 },
  feedItem: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: '#f3f4f6',
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
    backgroundColor: '#faf5f8',
  },
  ratingText: { color: COLORS.accent, fontSize: 16, fontWeight: '800' },
  mediaScroller: { gap: 10, paddingTop: 16, paddingLeft: AVATAR_SIZE + 12 },
  mediaImage: {
    width: 168,
    height: 128,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
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
