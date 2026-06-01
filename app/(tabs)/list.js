import { useState, useMemo, useCallback } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable, FlatList, ScrollView } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, COHORT_LABELS } from '../../lib/constants';
import { buildStackRankings } from '../../lib/personal-rankings';
import VenueRow from '../../components/VenueRow';

const VENUE_DATA = require('../../assets/venues.json');

export default function ListScreen() {
  const { user, profile } = useAuth();
  const [queryText, setQueryText] = useState('');
  const [activeCohort, setActiveCohort] = useState('all');
  const [comparisons, setComparisons] = useState([]);

  const cityKey = profile?.city || 'nyc';
  const cityVenues = VENUE_DATA.cities[cityKey]?.venues || [];

  const cohorts = useMemo(() => {
    const set = new Set(cityVenues.map((v) => v.cohort));
    return ['all', ...Array.from(set)];
  }, [cityVenues]);

  const loadPersonalData = useCallback(async () => {
    if (!user) return;
    try {
      const comparisonsQ = query(collection(db, 'comparisons'), where('userId', '==', user.uid));
      const comparisonsSnap = await getDocs(comparisonsQ);
      setComparisons(comparisonsSnap.docs.map((d) => d.data()));
    } catch (err) {
      console.error('List personal data load error:', err);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadPersonalData();
    }, [loadPersonalData])
  );

  const filtered = useMemo(() => {
    return cityVenues.filter((v) => {
      const matchesCohort = activeCohort === 'all' || v.cohort === activeCohort;
      const matchesQuery =
        !queryText || v.name.toLowerCase().includes(queryText.toLowerCase());
      return matchesCohort && matchesQuery;
    });
  }, [cityVenues, activeCohort, queryText]);

  const rankedVenues = useMemo(
    () => buildStackRankings(filtered, comparisons),
    [filtered, comparisons]
  );

  const renderVenue = ({ item }) => (
    <VenueRow
      item={item}
      cityKey={cityKey}
      onPress={() => router.push(`/venue/${item.id}`)}
    />
  );

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{cityKey.toUpperCase()}</Text>

      <TextInput
        style={styles.search}
        placeholder="Search venues..."
        placeholderTextColor={COLORS.textPlaceholder}
        value={queryText}
        onChangeText={setQueryText}
      />

      <View style={styles.filterRail}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          directionalLockEnabled
          alwaysBounceVertical={false}
          bounces={false}
          overScrollMode="never"
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
        >
          {cohorts.map((c) => (
            <Pressable
              key={c}
              style={[styles.filterChip, activeCohort === c && styles.filterChipActive]}
              onPress={() => setActiveCohort(c)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeCohort === c && styles.filterChipTextActive,
                ]}
              >
                {c === 'all' ? 'All' : COHORT_LABELS[c] || c}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={rankedVenues}
        renderItem={renderVenue}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  title: {
    color: COLORS.textPrimary, fontSize: 28, fontWeight: '800',
    marginTop: 48, marginBottom: 12,
  },
  search: {
    backgroundColor: COLORS.bgElevated, color: COLORS.textPrimary,
    fontSize: 16, padding: 14, borderRadius: 12, marginBottom: 12,
  },
  filterRail: { height: 52, justifyContent: 'center', marginBottom: 12 },
  filterScroll: { flexGrow: 0 },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  filterChip: {
    height: 36,
    backgroundColor: COLORS.bgElevated,
    paddingHorizontal: 14,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.accent,
  },
  filterChipText: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  filterChipTextActive: { color: COLORS.accent },
  listContent: { paddingBottom: 24 },
});
