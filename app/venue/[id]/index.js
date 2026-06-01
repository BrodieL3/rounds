import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  StyleSheet, Text, View, ScrollView, Pressable, Alert, TextInput, Linking,
} from 'react-native';
import { router } from 'expo-router';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { COLORS, COHORT_LABELS } from '../../../lib/constants';

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

export default function VenueDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const venue = findVenue(id);
  const [reportModal, setReportModal] = useState(false);
  const [reportText, setReportText] = useState('');

  if (!venue) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Venue not found</Text>
      </View>
    );
  }

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

  const tags = formatTypes(venue.types);
  const price = PRICE_LABELS[venue.priceLevel] || '—';
  const { latitude, longitude } = venue.location || {};

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.title}>{venue.name}</Text>

      <View style={styles.badgeRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{COHORT_LABELS[venue.cohort] || venue.cohort}</Text>
        </View>
        <Text style={styles.price}>{price}</Text>
      </View>

      <Pressable style={styles.addressRow} onPress={() => openMap(venue.name, latitude, longitude)}>
        <Text style={styles.address}>{venue.address}</Text>
        <Text style={styles.mapLink}>Open in Maps →</Text>
      </Pressable>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{venue.rating?.toFixed(1) || '—'}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{venue.userRatingCount || '—'}</Text>
          <Text style={styles.statLabel}>Reviews</Text>
        </View>
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

      <Pressable
        style={styles.rateBtn}
        onPress={() => router.push(`/venue/${venue.id}/rate`)}
      >
        <Text style={styles.rateBtnText}>Rate this place</Text>
      </Pressable>

      <Pressable style={styles.reportBtn} onPress={() => setReportModal(true)}>
        <Text style={styles.reportBtnText}>Report miscategorized</Text>
      </Pressable>

      {reportModal && (
        <View style={styles.reportCard}>
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
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, backgroundColor: COLORS.bg, padding: 24 },
  title: { color: COLORS.textPrimary, fontSize: 28, fontWeight: '800', marginTop: 48 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 16 },
  badge: {
    backgroundColor: COLORS.bgElevated,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { color: COLORS.accent, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  price: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },
  addressRow: { marginBottom: 16 },
  address: { color: COLORS.textSecondary, fontSize: 15, lineHeight: 22 },
  mapLink: { color: COLORS.accent, fontSize: 14, fontWeight: '700', marginTop: 4 },
  statsRow: {
    flexDirection: 'row', gap: 16,
    backgroundColor: COLORS.bgElevated, borderRadius: 16,
    padding: 16, marginBottom: 16,
  },
  stat: { alignItems: 'center', flex: 1 },
  statNum: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '800' },
  statLabel: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
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
  rateBtn: {
    backgroundColor: COLORS.hero, padding: 16,
    borderRadius: 12, alignItems: 'center', marginTop: 12,
  },
  rateBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
  reportBtn: {
    marginTop: 12, padding: 12, alignItems: 'center',
  },
  reportBtnText: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },
  reportCard: {
    backgroundColor: COLORS.bgElevated, padding: 16,
    borderRadius: 16, marginTop: 16,
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
