import { useState, useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  StyleSheet, Text, View, ScrollView, Pressable, Alert, TextInput, Linking, Modal,
} from 'react-native';
import { router } from 'expo-router';
import AppIcon from '../../../components/ui/AppIcon';
import {
  collection, addDoc, serverTimestamp,
  query, where, getDocs, orderBy, limit,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { COLORS, COHORT_LABELS } from '../../../lib/constants';
import { getVenueVisualFallback, formatOpenClosedStatus, formatVenueAverageScore } from '../../../lib/venue-visuals';
import { getBookmarkAsync, setBookmarkAsync, removeBookmarkAsync } from '../../../lib/venue-bookmark-service';
import CopyableText from '../../../components/ui/CopyableText';

const VENUE_DATA = require('../../../assets/venues.json');

function findVenue(id) {
  for (const cityKey of Object.keys(VENUE_DATA.cities)) {
    const v = VENUE_DATA.cities[cityKey].venues.find((x) => x.id === id);
    if (v) return v;
  }
  return null;
}

const PRICE_LABELS = {
  PRICE_LEVEL_FREE: 'Free',
  PRICE_LEVEL_INEXPENSIVE: '$',
  PRICE_LEVEL_MODERATE: '$$',
  PRICE_LEVEL_EXPENSIVE: '$$$',
  PRICE_LEVEL_VERY_EXPENSIVE: '$$$$',
};

const SKIP_TYPES = new Set([
  'point_of_interest', 'establishment', 'food', 'store', 'premise',
]);

function formatTypes(types) {
  if (!types) return [];
  return types
    .filter((t) => !SKIP_TYPES.has(t))
    .map((t) =>
      t
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
    )
    .slice(0, 6);
}

function openMap(name, lat, lng) {
  if (lat == null || lng == null) return;
  const label = encodeURIComponent(name);
  const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${label}`;
  Linking.openURL(url).catch(() => {});
}

function openWebsite(venueName) {
  const q = encodeURIComponent(`${venueName} website`);
  const url = `https://www.google.com/search?q=${q}`;
  Linking.openURL(url).catch(() => {});
}

export default function VenueDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const venue = findVenue(id);
  const [reportModal, setReportModal] = useState(false);
  const [reportText, setReportText] = useState('');
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [recentRatings, setRecentRatings] = useState([]);
  const [averageScore, setAverageScore] = useState(null);
  const [ratingsLoading, setRatingsLoading] = useState(true);

  useEffect(() => {
    if (!user || !venue) return;
    let canceled = false;

    async function loadBookmark() {
      const result = await getBookmarkAsync(user.uid, venue.id);
      if (!canceled) setBookmarked(result.exists);
    }

    async function loadRatings() {
      try {
        const q = query(
          collection(db, 'ratings'),
          where('venueId', '==', venue.id),
          where('visibility', '==', 'public'),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
        const snap = await getDocs(q);
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (!canceled) {
          setRecentRatings(docs);
          setAverageScore(formatVenueAverageScore(docs));
        }
      } catch (err) {
        console.error('Recent ratings load error:', err);
      } finally {
        if (!canceled) setRatingsLoading(false);
      }
    }

    loadBookmark();
    loadRatings();

    return () => { canceled = true; };
  }, [user, venue]);

  const toggleBookmark = async () => {
    if (!user || bookmarkLoading) return;
    setBookmarkLoading(true);
    try {
      if (bookmarked) {
        const result = await removeBookmarkAsync(user.uid, venue.id);
        if (!result.success) throw new Error(result.error);
        setBookmarked(false);
      } else {
        const result = await setBookmarkAsync(user.uid, {
          id: venue.id,
          name: venue.name,
          city: venue.city || Object.keys(VENUE_DATA.cities).find(
            (k) => VENUE_DATA.cities[k].venues.some((v) => v.id === venue.id)
          ) || 'nyc',
          cohort: venue.cohort,
        });
        if (!result.success) throw new Error(result.error);
        setBookmarked(true);
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setBookmarkLoading(false);
    }
  };

  const shareVenue = () => {
    router.push({ pathname: '/conversation/share-venue', params: { venueId: venue.id } });
  };

  const submitReport = async () => {
    if (!reportText.trim()) return;
    try {
      await addDoc(collection(db, 'reports'), {
        userId: user?.uid,
        venueId: venue.id,
        venueName: venue.name,
        currentCohort: venue.cohort,
        suggestedCohort: reportText.trim(),
        createdAt: serverTimestamp(),
      });
      Alert.alert('Thanks', 'Your report has been submitted.');
      setReportModal(false);
      setReportText('');
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  if (!venue) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Venue not found</Text>
      </View>
    );
  }

  const tags = formatTypes(venue.types);
  const price = PRICE_LABELS[venue.priceLevel] || '—';
  const { latitude, longitude } = venue.location || {};
  const visual = getVenueVisualFallback(venue);
  const openStatus = formatOpenClosedStatus(venue.hours);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.screen}>
      {/* Hero */}
      <View style={[styles.hero, { backgroundColor: visual.colors[0] }]}>
        <View style={styles.heroOverlay}>
          <AppIcon name={visual.iconName} size={48} color="#ffffff" />
        </View>
        {user && (
          <Pressable style={styles.bookmarkBtn} onPress={toggleBookmark} disabled={bookmarkLoading}>
            <AppIcon
              name={bookmarked ? 'bookmark' : 'bookmark-outline'}
              size={24}
              color="#ffffff"
            />
          </Pressable>
        )}
      </View>

      <Text style={styles.title}>{venue.name}</Text>

      <View style={styles.badgeRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{COHORT_LABELS[venue.cohort] || venue.cohort}</Text>
        </View>
        <Text style={styles.price}>{price}</Text>
        {openStatus && (
          <Text style={[styles.openStatus, openStatus.startsWith('Open') ? styles.open : styles.closed]}>
            {openStatus}
          </Text>
        )}
      </View>

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <Pressable style={styles.actionBtn} onPress={() => openWebsite(venue.name)}>
          <AppIcon name="globe-outline" size={18} color={COLORS.accent} />
          <Text style={styles.actionBtnText}>Website</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={() => openMap(venue.name, latitude, longitude)}>
          <AppIcon name="navigate-outline" size={18} color={COLORS.accent} />
          <Text style={styles.actionBtnText}>Directions</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={shareVenue}>
          <AppIcon name="paper-plane-outline" size={18} color={COLORS.accent} />
          <Text style={styles.actionBtnText}>Share</Text>
        </Pressable>
      </View>

      <View style={styles.addressRow}>
        <CopyableText accessibilityLabel="Venue address" style={styles.address}>
          {venue.address}
        </CopyableText>
        <Pressable hitSlop={8} onPress={() => openMap(venue.name, latitude, longitude)}>
          <Text style={styles.mapLink}>Open in Maps →</Text>
        </Pressable>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{venue.rating?.toFixed(1) || '—'}</Text>
          <Text style={styles.statLabel}>Google Rating</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{venue.userRatingCount || '—'}</Text>
          <Text style={styles.statLabel}>Google Reviews</Text>
        </View>
        {averageScore && (
          <View style={styles.stat}>
            <Text style={styles.statNum}>{averageScore}</Text>
            <Text style={styles.statLabel}>Rounds Rating</Text>
          </View>
        )}
      </View>

      {tags.length > 0 && (
        <View style={styles.tagsCard}>
          <Text style={styles.cardTitle}>Tags</Text>
          <View style={styles.tagsWrap}>
            {tags.map((t) => (
              <View key={t} style={styles.tag}>
                <Text style={styles.tagText}>{t}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {venue.hours?.weekdayDescriptions ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Hours</Text>
          {venue.hours.weekdayDescriptions.map((h, i) => (
            <Text key={i} style={styles.cardRow}>{h}</Text>
          ))}
        </View>
      ) : null}

      {/* Popular posts */}
      {recentRatings.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Popular posts</Text>
          {recentRatings.slice(0, 3).map((r) => (
            <View key={r.id} style={styles.ratingRow}>
              <Pressable
                style={{ flex: 1 }}
                onPress={() => router.push(`/post/${r.id}`)}
              >
                <View style={styles.ratingHeader}>
                  <Text style={styles.ratingUser}>{r.displayName || r.username || 'Anonymous'}</Text>
                  <Text style={[styles.ratingSentiment, r.sentiment === 'loved' && styles.loved]}>
                    {r.sentiment === 'loved' ? '❤️' : r.sentiment === 'fine' ? '👍' : '👎'}
                  </Text>
                </View>
                {r.notes ? (
                  <Text style={styles.ratingNotes} numberOfLines={2}>{r.notes}</Text>
                ) : null}
              </Pressable>
              {user && (
                <Pressable
                  style={styles.ratingShareBtn}
                  onPress={() => router.push({
                    pathname: '/conversation/share-review',
                    params: {
                      ratingId: r.id,
                      venueId: r.venueId,
                      venueName: r.venueName,
                      venueCohort: r.cohort,
                      sentiment: r.sentiment,
                      authorDisplayName: r.displayName,
                      authorUsername: r.username,
                      notes: r.notes || '',
                    },
                  })}
                >
                  <AppIcon name="paper-plane-outline" size={16} color={COLORS.accent} />
                </Pressable>
              )}
            </View>
          ))}
        </View>
      )}

      <Pressable
        style={styles.rateBtn}
        onPress={() => router.push(`/venue/${venue.id}/rate`)}
      >
        <Text style={styles.rateBtnText}>Log a visit</Text>
      </Pressable>

      <Pressable style={styles.reportBtn} onPress={() => setReportModal(true)}>
        <Text style={styles.reportBtnText}>Report miscategorized</Text>
      </Pressable>

      <Modal
        visible={reportModal}
        animationType="slide"
        transparent
        presentationStyle="pageSheet"
        onRequestClose={() => setReportModal(false)}
      >
        <View style={styles.reportBackdrop}>
          <View style={styles.reportCard}>
            <View style={styles.reportGrabber} />
            <Text style={styles.reportTitle}>Report miscategorization</Text>
            <Text style={styles.reportCopy}>
              Current: {COHORT_LABELS[venue.cohort] || venue.cohort}
            </Text>
            <TextInput
              style={styles.reportInput}
              placeholder="What should it be?"
              placeholderTextColor={COLORS.textPlaceholder}
              value={reportText}
              onChangeText={setReportText}
              autoFocus
            />
            <View style={styles.reportActions}>
              <Pressable style={styles.reportCancel} onPress={() => setReportModal(false)}>
                <Text style={styles.reportCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.reportSubmit} onPress={submitReport}>
                <Text style={styles.reportSubmitText}>Submit</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, backgroundColor: COLORS.bg, padding: 24 },
  hero: {
    height: 180,
    borderRadius: 16,
    marginTop: 24,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  heroOverlay: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookmarkBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { color: COLORS.textPrimary, fontSize: 28, fontWeight: '800', marginTop: 8 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 12, flexWrap: 'wrap' },
  badge: {
    backgroundColor: COLORS.bgElevated,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { color: COLORS.accent, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  price: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },
  openStatus: { fontSize: 13, fontWeight: '700' },
  open: { color: COLORS.success },
  closed: { color: COLORS.danger },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.bgElevated,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.bgCard,
  },
  actionBtnText: { color: COLORS.accent, fontSize: 14, fontWeight: '700' },
  addressRow: { marginBottom: 16 },
  address: { color: COLORS.textSecondary, fontSize: 15, lineHeight: 22 },
  mapLink: { color: COLORS.accent, fontSize: 14, fontWeight: '700', marginTop: 4 },
  statsRow: {
    flexDirection: 'row', gap: 16,
    backgroundColor: COLORS.bgElevated, borderRadius: 16,
    padding: 16, marginBottom: 16,
  },
  stat: { alignItems: 'center', flex: 1 },
  statNum: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  statLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 2, textAlign: 'center' },
  card: {
    backgroundColor: COLORS.bgElevated, padding: 16,
    borderRadius: 16, marginBottom: 12,
  },
  cardTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  cardRow: { color: COLORS.textSecondary, fontSize: 14, marginBottom: 4 },
  tagsCard: {
    backgroundColor: COLORS.bgElevated, padding: 16,
    borderRadius: 16, marginBottom: 12,
  },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    backgroundColor: COLORS.bgCard,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8,
  },
  tagText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.bgCard,
    paddingVertical: 10,
    gap: 8,
  },
  ratingShareBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingUser: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  ratingSentiment: { fontSize: 14 },
  loved: { color: COLORS.success },
  ratingNotes: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 18 },
  rateBtn: {
    backgroundColor: COLORS.hero, padding: 16,
    borderRadius: 12, alignItems: 'center', marginTop: 12,
  },
  rateBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
  reportBtn: {
    marginTop: 12, padding: 12, alignItems: 'center',
  },
  reportBtnText: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },
  reportBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.24)',
    padding: 16,
  },
  reportCard: {
    backgroundColor: COLORS.bg,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.bgCard,
  },
  reportGrabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.bgCard,
    marginBottom: 12,
  },
  reportTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700' },
  reportCopy: { color: COLORS.textSecondary, fontSize: 14, marginTop: 4 },
  reportInput: {
    backgroundColor: COLORS.bgCard, color: COLORS.textPrimary,
    fontSize: 16, padding: 14, borderRadius: 12, marginTop: 12,
  },
  reportActions: {
    flexDirection: 'row', gap: 10, marginTop: 12, justifyContent: 'flex-end',
  },
  reportCancel: { padding: 10 },
  reportCancelText: { color: COLORS.textMuted, fontWeight: '600' },
  reportSubmit: {
    backgroundColor: COLORS.accent, paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 8,
  },
  reportSubmitText: { color: '#ffffff', fontWeight: '800' },
});
