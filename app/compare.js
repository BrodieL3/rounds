import { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet, Text, View, Pressable, Alert,
} from 'react-native';
import { router } from 'expo-router';
import {
  collection, query, where, getDocs, addDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, COHORT_LABELS, DEFAULT_METRO, getMetroCities } from '../lib/constants';
import { computeRankings } from '../lib/ranking';
import { normalizeComparison } from '../lib/personal-rankings';
import { assignDisplayScores } from '../lib/scoring';
import { nextComparison } from '../lib/compare-select';
import { buildComparisonPayload, newSessionId } from '../lib/comparisons/comparison-payload';
import { usePostHog } from 'posthog-react-native';

const VENUE_DATA = require('../assets/venues.json');

function findVenue(id) {
  for (const cityKey of Object.keys(VENUE_DATA.cities)) {
    const v = VENUE_DATA.cities[cityKey].venues.find((x) => x.id === id);
    if (v) return v;
  }
  return null;
}

// Pair selection now lives in lib/compare-select.js (binary-search insertion,
// ADR 008 §2) — ~log2(n) taps instead of all-pairs O(n^2).

export default function CompareScreen() {
  const { user, profile } = useAuth();
  const posthog = usePostHog();
  const [pair, setPair] = useState(null);
  const [comparisons, setComparisons] = useState([]);
  const [venues, setVenues] = useState([]);
  const [cohort, setCohort] = useState('');
  const [loading, setLoading] = useState(true);
  const [sentimentByVenue, setSentimentByVenue] = useState({});
  const sessionIdRef = useRef(null);
  const sequenceRef = useRef(0);

  useEffect(() => {
    if (!user) return;
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

      // Map each rated venue → the user's sentiment so each comparison can carry
      // both venues' sentiment band (ADR 009 §5 — the connectivity prior Tier B uses).
      const sentByVenue = {};
      for (const r of ratings) {
        if (r.venueId) sentByVenue[r.venueId] = r.sentiment || null;
      }
      setSentimentByVenue(sentByVenue);

      // One session id per compare session; sequence increments per decision so
      // Tier B can reconstruct "one user, N comparisons" (anti-gaming, ADR 009 §6).
      sessionIdRef.current = newSessionId();
      sequenceRef.current = 0;

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

      // Venues span the whole metro lens (Boston + Cambridge), matching My List —
      // not a per-user city field, which is never written (ADR 007).
      const metro = profile?.metro || DEFAULT_METRO;
      const metroVenues = getMetroCities(metro)
        .flatMap((c) => VENUE_DATA.cities[c]?.venues || []);
      const cohortVenues = metroVenues.filter((v) => v.cohort === targetCohort);
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

      const nextPair = nextComparison({
        venues: cohortVenues,
        comparisons: comps,
        sentimentByVenue: sentByVenue,
      });
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
      const payload = buildComparisonPayload({
        userId: user.uid,
        cohort,
        venueA: a,
        venueB: b,
        result,
        sentimentA: sentimentByVenue[a] || null,
        sentimentB: sentimentByVenue[b] || null,
        city: profile?.metro || DEFAULT_METRO,
        sessionId: sessionIdRef.current || newSessionId(),
        sequence: sequenceRef.current,
        context: 'placement-search',
        createdAt: serverTimestamp(),
      });
      sequenceRef.current += 1;
      await addDoc(collection(db, 'comparisons'), payload);

      posthog.capture('comparison_submitted', {
        cohort,
        venue_a: a,
        venue_b: b,
        result,
        is_too_tough: result === 'too-tough',
      });

      const next = [...comparisons, { a, b, result }];
      setComparisons(next);
      const nextPair = nextComparison({ venues, comparisons: next, sentimentByVenue });
      if (!nextPair) {
        posthog.capture('ranking_completed', {
          cohort,
          total_comparisons: next.length,
          venue_count: venues.length,
        });
      }
      setPair(nextPair);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }, [pair, comparisons, venues, cohort, user, profile, sentimentByVenue]);

  if (loading) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Loading...</Text>
      </View>
    );
  }

  if (!pair) {
    const ranked = computeRankings(venues, comparisons, { seedBySentiment: sentimentByVenue });
    const ranking = assignDisplayScores(ranked, sentimentByVenue)
      .sort((a, b) => b.displayScore - a.displayScore);
    return (
      <View style={styles.screen}>
        <Text style={styles.eyebrow}>{COHORT_LABELS[cohort] || cohort}</Text>
        <Text style={styles.title}>All caught up!</Text>
        <Text style={styles.copy}>Your {COHORT_LABELS[cohort] || cohort} ranking is set.</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your ranking</Text>
          {ranking.map((v, i) => (
            <View key={v.id} style={styles.rankRow}>
              <Text style={styles.rankNum}>{i + 1}</Text>
              <Text style={styles.rankName}>{v.name}</Text>
              <Text style={styles.rankScore}>{v.displayScore?.toFixed(1)}</Text>
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
