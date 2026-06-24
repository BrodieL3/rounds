import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import AppIcon from '../../ui/AppIcon';
import { COLORS, COHORT_LABELS } from '../../../lib/constants';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { getVenueVisualFallback } from '../../../lib/venue-visuals';

const { buildStackRankings } = require('../../../lib/personal-rankings');
const VENUE_DATA = require('../../../assets/venues.json');

// Venue picker: the viewer's personally-ranked venues (their #1 first), the rest in catalog
// order, all searchable. Tapping a venue shares it into the chat as a venue_link.
export default function VenuePanel({ onSendVenue, sending }) {
  const { user, profile } = useAuth();
  const cities = VENUE_DATA.cities || {};
  // Prefer the user's city; if it has no seeded venues, search across every city so the
  // panel is never empty. Each venue carries its own cityKey for the venue_link payload.
  const preferredCity = profile?.city && cities[profile.city]?.venues?.length ? profile.city : null;
  const source = useMemo(() => {
    if (preferredCity) {
      return cities[preferredCity].venues.map((v) => ({ ...v, cityKey: preferredCity }));
    }
    return Object.entries(cities).flatMap(([k, c]) => (c.venues || []).map((v) => ({ ...v, cityKey: k })));
  }, [preferredCity]);
  const [comparisons, setComparisons] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    getDocs(query(collection(db, 'comparisons'), where('userId', '==', user.uid)))
      .then((snap) => setComparisons(snap.docs.map((d) => d.data())))
      .catch((err) => console.error('Venue panel comparisons load error:', err));
  }, [user]);

  const ranked = useMemo(
    () => buildStackRankings(source, comparisons),
    [source, comparisons],
  );

  const venues = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ranked;
    return ranked.filter((v) => (v.name || '').toLowerCase().includes(q));
  }, [ranked, search]);

  const renderItem = ({ item }) => {
    const visual = getVenueVisualFallback(item);
    return (
      <Pressable
        accessibilityRole="button"
        style={[styles.row, sending && styles.disabled]}
        disabled={sending}
        onPress={() => onSendVenue({ venue: { ...item, city: item.cityKey }, cityKey: item.cityKey })}
      >
        <View style={[styles.thumb, { backgroundColor: visual.colors[0] }]}>
          <AppIcon name={visual.iconName} size={20} color="#ffffff" />
        </View>
        <View style={styles.copy}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.meta} numberOfLines={1}>{COHORT_LABELS[item.cohort] || item.cohort}</Text>
        </View>
        {item.hasPersonalRank ? <Text style={styles.rank}>#{item.personalRank}</Text> : null}
        <AppIcon name="paper-plane-outline" size={18} color={COLORS.accent} />
      </Pressable>
    );
  };

  return (
    <View style={styles.panel}>
      <View style={styles.searchBar}>
        <AppIcon name="search" size={18} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search venues..."
          placeholderTextColor={COLORS.textPlaceholder}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <FlatList
        style={styles.flex}
        data={venues}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No venues found.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1, paddingHorizontal: 12, paddingTop: 10 },
  flex: { flex: 1 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.bgElevated,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 8,
  },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: 15, padding: 0 },
  list: { paddingBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  disabled: { opacity: 0.5 },
  thumb: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  name: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  meta: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  rank: { color: COLORS.accent, fontSize: 13, fontWeight: '800', marginRight: 2 },
  empty: { color: COLORS.textMuted, textAlign: 'center', marginTop: 24 },
});
