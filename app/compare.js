import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, Pressable, Alert,
} from 'react-native';
import { router } from 'expo-router';
import {
  collection, query, where, getDocs, addDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, COHORT_LABELS } from '../lib/constants';
import { computeRankings } from '../lib/ranking';
import { normalizeComparison } from '../lib/personal-rankings';

const VENUE_DATA = require('../assets/venues.json');

function findVenue(id) {
  for (const cityKey of Object.keys(VENUE_DATA.cities)) {
    const v = VENUE_DATA.cities[cityKey].venues.find((x) => x.id === id);
    if (v) return v;
  }
  return null;
}

function pickRandomPair(venues, history) {
  const ids = venues.map((v) => v.id);
  const compared = new Set(
    history
      .map(normalizeComparison)
      .filter(Boolean)
      .map((h) => `${h.a}-${h.b}`)
  );
  const pairs = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const key = `${ids[i]}-${ids[j]}`;
      if (!compared.has(key)) pairs.push([ids[i], ids[j]]);
    }
  }
  if (pairs.length === 0) return null;
  return pairs[Math.floor(Math.random() * pairs.length)];
}

export default function CompareScreen() {
  const { user, profile } = useAuth();
  const [pair, setPair] = useState(null);
  const [comparisons, setComparisons] = useState([]);
  const [venues, setVenues] = useState([]);
  const [cohort, setCohort] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !profile?.city) return;
    loadData();
  }, [user, profile]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get user's ratings to find cohorts with 2+ ratings
      const ratingsQ = query(
        collection(db, 'ratings'),
        where('userId', '==', user.uid)
      );
      const ratingsSnap = await getDocs(ratingsQ);
      const ratings = ratingsSnap.docs.map((d) => d.data());

      // Find first cohort with 2+ ratings
      const cohortCounts = {};
      for (const r of ratings) {
        cohortCounts[r.cohort] = (cohortCounts[r.cohort] || 0) + 1;
      }
      const targetCohort = Object.keys(cohortCounts).find((c) => cohortCounts[c] >= 2);
      if (!targetCohort) {
        Alert.alert('Not enough ratings', 'Rate at least 2 venues of the same type first.');
        router.back();
        return;
      }
      setCohort(targetCohort);

      // Get venues in this cohort
      const cityVenues = VENUE_DATA.cities[profile.city]?.venues || [];
      const cohortVenues = cityVenues.filter((v) => v.cohort === targetCohort);
      setVenues(cohortVenues);

      // Get existing comparisons
      const compQ = query(
        collection(db, 'comparisons'),
        where('userId', '==', user.uid),
        where('cohort', '==', targetCohort)
      );
      const compSnap = await getDocs(compQ);
      const comps = compSnap.docs.map((d) => normalizeComparison(d.data())).filter(Boolean);
      setComparisons(comps);

      const nextPair = pickRandomPair(cohortVenues, comps);
      setPair(nextPair);
    } catch (err) {
      console.error('Compare load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const submit = useCallback(async (result) => {
    if (!pair) return;
    const [a, b] = pair;
    try {
      await addDoc(collection(db, 'comparisons'), {
        userId: user.uid,
        cohort,
        venueA: a,
        venueB: b,
        result,
        createdAt: serverTimestamp(),
      });

      const next = [...comparisons, { a, b, result }];
      setComparisons(next);
      const nextPair = pickRandomPair(venues, next);
      setPair(nextPair);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }, [pair, comparisons, venues, cohort, user]);

  if (loading) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Loading...</Text>
      </View>
    );
  }

  if (!pair) {
    const ranking = computeRankings(venues, comparisons);
    return (
      <View style={styles.screen}>
        <Text style={styles.eyebrow}>{COHORT_LABELS[cohort] || cohort}</Text>
        <Text style={styles.title}>All caught up!</Text>
        <Text style={styles.copy}>You've compared every pairing in this cohort.</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your ranking</Text>
          {ranking.map((v, i) => (
            <View key={v.id} style={styles.rankRow}>
              <Text style={styles.rankNum}>{i + 1}</Text>
              <Text style={styles.rankName}>{v.name}</Text>
              <Text style={styles.rankScore}>{v.rating}</Text>
            </View>
          ))}
        </View>

        <Pressable style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Done</Text>
        </Pressable>
      </View>
    );
  }

  const venueA = venues.find((v) => v.id === pair[0]);
  const venueB = venues.find((v) => v.id === pair[1]);

  return (
    <View style={styles.screen}>
      <Text style={styles.eyebrow}>{COHORT_LABELS[cohort] || cohort}</Text>
      <Text style={styles.title}>Which was better?</Text>

      <View style={styles.card}>
        <View style={styles.venueBlock}>
          <Text style={styles.venueName}>{venueA?.name}</Text>
          <Text style={styles.venueMeta}>{venueA?.address?.split(',')[0]}</Text>
        </View>
        <Text style={styles.vs}>vs</Text>
        <View style={styles.venueBlock}>
          <Text style={styles.venueName}>{venueB?.name}</Text>
          <Text style={styles.venueMeta}>{venueB?.address?.split(',')[0]}</Text>
        </View>

        <View style={styles.buttonRow}>
          <Pressable style={styles.button} onPress={() => submit(venueA.id)}>
            <Text style={styles.buttonText}>{venueA?.name}</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.buttonSecondary]} onPress={() => submit('too-tough')}>
            <Text style={[styles.buttonText, styles.buttonSecondaryText]}>Too tough</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={() => submit(venueB.id)}>
            <Text style={styles.buttonText}>{venueB?.name}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, padding: 24 },
  eyebrow: {
    color: COLORS.accent, textTransform: 'uppercase',
    letterSpacing: 2, fontWeight: '700', marginTop: 48,
  },
  title: { color: COLORS.textPrimary, fontSize: 28, fontWeight: '800', marginTop: 8 },
  copy: { color: COLORS.textSecondary, fontSize: 16, marginTop: 8, lineHeight: 22 },
  card: {
    backgroundColor: COLORS.bgElevated, borderRadius: 20,
    padding: 24, marginVertical: 20, gap: 16,
  },
  venueBlock: { alignItems: 'center', gap: 4 },
  venueName: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  venueMeta: { color: COLORS.textMuted, fontSize: 14 },
  vs: { color: COLORS.accent, textAlign: 'center', fontWeight: '800', fontSize: 16 },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 8, justifyContent: 'center' },
  button: {
    backgroundColor: COLORS.accent, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 16,
    flex: 1, alignItems: 'center',
  },
  buttonSecondary: { backgroundColor: COLORS.bgCard },
  buttonText: { color: COLORS.bg, fontWeight: '800', fontSize: 13 },
  buttonSecondaryText: { color: COLORS.accent },
  section: { marginTop: 8, gap: 8 },
  sectionTitle: { color: COLORS.textPrimary, fontWeight: '700', fontSize: 16, marginBottom: 4 },
  rankRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, borderBottomColor: COLORS.bgCard, borderBottomWidth: 1,
  },
  rankNum: { color: COLORS.accent, fontWeight: '800', width: 24 },
  rankName: { color: COLORS.textPrimary, flex: 1, fontWeight: '600' },
  rankScore: { color: COLORS.textMuted, fontWeight: '600', width: 55, textAlign: 'right' },
});
