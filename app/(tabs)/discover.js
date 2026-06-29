import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AppIcon from '../../components/ui/AppIcon';
import { router } from 'expo-router';
import {
  collection, doc, limit, onSnapshot, orderBy, query, updateDoc, where,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, COHORT_LABELS, DEFAULT_METRO, METROS } from '../../lib/constants';
import MediaImage from '../../components/ui/media-image';
import VenueRow from '../../components/VenueRow';
import ScreenContainer from '../../components/ui/ScreenContainer';

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
const { mergeFeed } = require('../../lib/feed-merge');
const { tonightWindow } = require('../../lib/events/tonight-window');
const { buildEventItemDisplay } = require('../../lib/events/event-display');
const { buildVenueCatalog, getAttribution } = require('../../lib/venue-catalog');
const venueSeed = require('../../assets/venues.json');
const { usePostHog } = require('posthog-react-native');

const AVATAR_SIZE = 44;
const VENUES_BY_CITY = createSeedVenueLookup(venueSeed);

// Real uploaded profile photo only — no auto-generated avatars. A missing photo
// falls back to the initials placeholder (matching ProfileAvatar / friends).
function getAvatarPhoto(item) {
  return item.photoURL
    || item.avatarURL
    || item.userPhotoURL
    || item.profilePhotoURL
    || item.authorPhotoURL
    || null;
}

function getAvatarInitial(item) {
  return (item.displayName || item.username || '?').charAt(0).toUpperCase();
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
  const avatarPhoto = getAvatarPhoto(item);
  const mediaRefs = getMediaReferences(item);
  const posthog = usePostHog();
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
        {avatarPhoto ? (
          <MediaImage source={{ uri: avatarPhoto }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{getAvatarInitial(item)}</Text>
          </View>
        )}

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
        onLikePress={() => {
          updateEngagement('like', buildPostLikeUpdate);
          if (!liked) posthog.capture('post_liked', { post_id: item.id, venue_id: item.venueId, venue_name: item.venueName });
        }}
        onCommentPress={openPost}
        onSharePress={sharePost}
        onBookmarkPress={() => updateEngagement('bookmark', buildPostBookmarkUpdate)}
        disabledAction={pendingAction}
      />
    </Pressable>
  );
}

// Tonight's event-post — the imminence-tier card that leads Discover. Visually
// distinct from Review posts (TONIGHT pill, accent border). Tapping opens the venue.
export function DiscoverEventCard({ item }) {
  const display = buildEventItemDisplay(item);
  return (
    <Pressable
      style={styles.eventCard}
      onPress={() => router.push(`/venue/${encodeURIComponent(item.venueId)}`)}
      accessibilityRole="button"
      accessibilityLabel={`${display.title} at ${display.venueName} tonight`}
    >
      <View style={styles.eventTopRow}>
        <View style={styles.tonightPill}>
          <Text style={styles.tonightPillText}>TONIGHT</Text>
        </View>
        {display.time ? <Text style={styles.eventTime}>{display.time}</Text> : null}
      </View>
      <Text style={styles.eventTitle}>{display.icon} {display.title}</Text>
      <Text style={styles.eventVenue}>{display.venueName}</Text>
      <Text style={styles.eventMeta}>{display.metadata}</Text>
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

// Discover is the public social feed: public Rating projections from the
// viewer's city, with people they follow surfaced first (buildFeedViewItems).
// Browse/search lives on My List; this surface is read-only social discovery.
// A city with no public posts shows the empty state below.
export default function DiscoverScreen() {
  const { user, profile } = useAuth();
  const currentUserId = user?.uid || null;
  // P1 will set this from device GPS (Beli-exact). Until then the lens defaults
  // to the Boston metro so Discover shows Boston + Cambridge, not a phantom city.
  const metro = profile?.metro || DEFAULT_METRO;
  const metroCities = METROS[metro]?.cities || [];
  const fallbackCity = metroCities[0] || null;
  const following = useMemo(() => profile?.following || [], [profile?.following]);

  const [posts, setPosts] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Two equality filters (no orderBy) need no composite index; the view model
    // sorts by recency client-side, so limit() just caps reads for the feed.
    const postsQuery = query(
      collection(db, 'posts'),
      where('visibility', '==', 'public'),
      where('metro', '==', metro),
      limit(100),
    );
    const unsubscribe = onSnapshot(
      postsQuery,
      (snapshot) => {
        setPosts(snapshot.docs.map((snap) => ({ id: snap.id, ...snap.data() })));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsubscribe;
  }, [metro]);

  useEffect(() => {
    // Tonight's events for this metro. The startTime range + metro equality use the
    // deployed (metro, startTime) composite index; mergeFeed re-filters to the exact
    // tonight window client-side so the card list never drifts from the query bounds.
    const { startISO, endISO } = tonightWindow();
    const eventsQuery = query(
      collection(db, 'events'),
      where('metro', '==', metro),
      where('startTime', '>=', startISO),
      where('startTime', '<=', endISO),
      orderBy('startTime', 'asc'),
      limit(50),
    );
    const unsubscribe = onSnapshot(
      eventsQuery,
      (snapshot) => setEvents(snapshot.docs.map((snap) => ({ id: snap.id, ...snap.data() }))),
      () => setEvents([]),
    );
    return unsubscribe;
  }, [metro]);

  const postItems = useMemo(
    () => buildFeedViewItems({ posts, city: fallbackCity, following, venueLookup: VENUES_BY_CITY }),
    [posts, fallbackCity, following],
  );

  // Imminence leads recency: tonight's events first (soonest-first, tagged 'event'),
  // then the social post feed. mergeFeed with no posts yields just the events.
  const tonightItems = useMemo(() => mergeFeed({ posts: [], events }), [events]);
  const items = useMemo(() => [...tonightItems, ...postItems], [tonightItems, postItems]);

  return (
    <ScreenContainer style={styles.screen}>
      <FlatList
        data={items}
        keyExtractor={(item) => (item.type === 'event' ? `event-${item.id}` : item.id)}
        renderItem={({ item }) => (
          item.type === 'event' ? (
            <DiscoverEventCard item={item} />
          ) : (
            <DiscoverItem item={item} city={fallbackCity} currentUserId={currentUserId} />
          )
        )}
        ListHeaderComponent={(
          <View style={styles.header}>
            <Text style={styles.title}>Discover</Text>
          </View>
        )}
        ListEmptyComponent={loading ? (
          <View style={styles.empty}>
            <ActivityIndicator color={COLORS.accent} />
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No reviews yet</Text>
            <Text style={styles.emptySub}>
              Public reviews from people in your city will show up here.
            </Text>
          </View>
        )}
        contentContainerStyle={styles.feedListContent}
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  // Tonight's event-post card — accent border + TONIGHT pill set it apart from
  // the Review post rows below it in the same imminence-then-recency list.
  eventCard: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  eventTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  tonightPill: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tonightPillText: { color: COLORS.onAccent, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  eventTime: { color: COLORS.accent, fontSize: 14, fontWeight: '800' },
  eventTitle: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '800' },
  eventVenue: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '600', marginTop: 2 },
  eventMeta: { color: COLORS.textMuted, fontSize: 13, marginTop: 6 },
  // Standalone header (the SectionList that used to supply the inset is gone),
  // so pad it by 20 to match the app's standard title position (e.g. My List).
  header: { paddingTop: 16, paddingHorizontal: 20 },
  title: {
    color: COLORS.textPrimary,
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 18,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 15,
    lineHeight: 21,
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
  // Feed rows own their horizontal padding + full-width divider, so the list
  // container only pads the bottom and grows to center the empty/loading state.
  feedListContent: { paddingBottom: 24, flexGrow: 1 },
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
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: COLORS.accent, fontSize: 18, fontWeight: '800' },
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
