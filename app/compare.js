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
import { normalizeComparison, buildStackRankings } from '../lib/personal-rankings';
import { nextComparison } from '../lib/duel-select';
import { buildComparisonPayload, newSessionId } from '../lib/comparisons/comparison-payload';
import { usePostHog } from 'posthog-react-native';

const VENUE_DATA = require('../assets/venues.json');

const RATED_SENTIMENTS = new Set(['loved', 'fine', 'disliked']);
// Stopping rule (ADR 010 section 3): a venue is confidently placed once its
// posterior variance drops to/under this; the session also ends at a soft cap.
// Tunable per ADR 010 sections 2/3.
const PLACEMENT_VARIANCE_TARGET = 0.5;
const SESSION_COMPARISON_CAP = 10;

export default function CompareScreen() {
  const { user, profile } = useAuth();
  const posthog = usePostHog();
  const [pair, setPair] = useState(null);
  const [comparisons, setComparisons] = useState([]);
  const [venues, setVenues] = useState([]);
  const [cohort, setCohort] = useState('');
  const [loading, setLoading] = useState(true);
  const [sentimentByVenue, setSentimentByVenue] = useState({});
  const [cooldownPairs, setCooldownPairs] = useState([]);
  const sessionIdRef = useRef(null);
  const sequenceRef = useRef(0);
  const sessionCountRef = useRef(0);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user, profile]);

  const loadData = async () => {
    setLoading(true);
    try {
      const ratingsQ = query(
        collection(db, 'ratings'),
        where('userId', '==', user.uid)
      );
      const ratingsSnap = await getDocs(ratingsQ);
      const ratings = ratingsSnap.docs.map((d) => d.data());

      const sentByVenue = {};
      for (const r of ratings) {
        if (r.venueId) sentByVenue[r.venueId] = r.sentiment || null;
      }
      setSentimentByVenue(sentByVenue);

      sessionIdRef.current = newSessionId();
      sequenceRef.current = 0;
      sessionCountRef.current = 0;
      setCooldownPairs([]);

      const metro = profile?.metro || DEFAULT_METRO;
      const metroVenues = getMetroCities(metro)
        .flatMap((c) => VENUE_DATA.cities[c]?.venues || []);

      const ratedVenueIdsByCohort = {};
      for (const venue of metroVenues) {
        if (!RATED_SENTIMENTS.has(sentByVenue[venue.id])) continue;
        if (!ratedVenueIdsByCohort[venue.cohort]) ratedVenueIdsByCohort[venue.cohort] = new Set();
        ratedVenueIdsByCohort[venue.cohort].add(venue.id);
      }
      const targetCohort = Object.keys(ratedVenueIdsByCohort)
        .find((c) => ratedVenueIdsByCohort[c].size >= 2);

      if (!targetCohort) {
        setCohort('');
        setVenues([]);
        setPair(null);
        setLoading(false);
        return;
      }
      setCohort(targetCohort);

      const cohortVenues = metroVenues.filter((v) =>
        v.cohort === targetCohort && RATED_SENTIMENTS.has(sentByVenue[v.id])
      );
      setVenues(cohortVenues);

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
        cooldownPairs: [],
        varianceTarget: PLACEMENT_VARIANCE_TARGET,
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
    if (!user) {
      Alert.alert('Sign in required', 'Sign in before comparing spots.');
      return;
    }
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

      const next = [...comparisons, { a, b, result, cohort }];
      setComparisons(next);
      const nextCooldown = result === 'too-tough' ? [...cooldownPairs, [a, b]] : cooldownPairs;
      setCooldownPairs(nextCooldown);
      sessionCountRef.current += 1;
      const reachedCap = sessionCountRef.current >= SESSION_COMPARISON_CAP;
      const nextPair = reachedCap ? null : nextComparison({
        venues,
        comparisons: next,
        sentimentByVenue,
        cooldownPairs: nextCooldown,
        varianceTarget: PLACEMENT_VARIANCE_TARGET,
      });
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
  }, [pair, comparisons, venues, cohort, user, profile, sentimentByVenue, cooldownPairs]);

  if (loading) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Loading...</Text>
      </View>
    );
  }

  if (!cohort) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Nothing to rank yet</Text>
        <Text style={styles.copy}>Rate a couple of spots to start ranking.</Text>
        <Pressable style={styles.ctaButton} onPress={() => router.push('/add')}>
          <Text style={styles.buttonText}>Find spots to rate</Text>
        </Pressable>
      </View>
    );
  }

  if (!pair) {
    const ranking = buildStackRankings(venues, comparisons, { cohort, sentimentByVenue }).filter((v) => v.hasPersonalRank);
    return (
      <View style={styles.screen}>
        <Text style={styles.eyebrow}>{COHORT_LABELS[cohort] || cohort}</Text>
        <Text style={styles.title}>All caught up!</Text>
        <Text style={styles.copy}>Your {COHORT_LABELS[cohort] || cohort} ranking is set.</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your ranking</Text>
          {ranking.map((v) => (
            <View key={v.id} style={styles.rankRow}>
              <Text style={styles.rankNum}>{v.personalRank}</Text>
              <Text style={styles.rankName}>{v.name}</Text>
              <Text style={styles.rankScore}>{v.personalScore?.toFixed(1)}</Text>
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
  ctaButton: {
    backgroundColor: COLORS.accent, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 16,
    alignItems: 'center', alignSelf: 'flex-start', marginTop: 20,
  },
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
