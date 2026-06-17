import { useState, useMemo, useCallback } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { collection, query, where, getDocs } from 'firebase/firestore';
import AppIcon from '../../components/ui/AppIcon';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, COHORT_LABELS } from '../../lib/constants';
import { buildStackRankings } from '../../lib/personal-rankings';
import { buildVisitHistory, getLogCount, getRankUnlockState } from '../../lib/my-list';
import VenueRow from '../../components/VenueRow';
import ScreenContainer from '../../components/ui/ScreenContainer';

const VENUE_DATA = require('../../assets/venues.json');

const SENTIMENT_TONE = {
  loved: COLORS.success,
  fine: COLORS.accent,
  disliked: COLORS.danger,
};

// My List (F3 final slice — the payoff; parent ISA ISC-17/18/19/20/54/55):
// a running, 05-themed record of the bars the user has logged + a ranked area
// that stays locked ("rank unlocks at 5 visits") until the 5th log, then
// reveals the personal ranked list via the EXISTING Elo engine.
export default function ListScreen() {
  const { user, profile } = useAuth();
  const [ratings, setRatings] = useState([]);
  const [comparisons, setComparisons] = useState([]);

  const cityKey = profile?.city || 'nyc';
  const cityVenues = VENUE_DATA.cities[cityKey]?.venues || [];

  const loadPersonalData = useCallback(async () => {
    if (!user) {
      setRatings([]);
      setComparisons([]);
      return;
    }
    try {
      const ratingsQ = query(collection(db, 'ratings'), where('userId', '==', user.uid));
      const comparisonsQ = query(collection(db, 'comparisons'), where('userId', '==', user.uid));
      const [ratingsSnap, comparisonsSnap] = await Promise.all([
        getDocs(ratingsQ),
        getDocs(comparisonsQ),
      ]);
      setRatings(ratingsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setComparisons(comparisonsSnap.docs.map((d) => d.data()));
    } catch (err) {
      console.error('My List load error:', err);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadPersonalData();
    }, [loadPersonalData])
  );

  // The user's logged-visit history (most-recent-first, one entry per venue).
  const history = useMemo(() => buildVisitHistory(ratings), [ratings]);

  // The rank-unlock-at-5 gate is keyed on logged visits (ISC-18/19).
  const logCount = getLogCount(ratings);
  const unlock = useMemo(() => getRankUnlockState(logCount), [logCount]);
  const { unlocked } = unlock;

  // The ranked list is still derived from Comparisons via the EXISTING Elo
  // (lib/personal-rankings.js → lib/ranking.js); we only build it once unlocked.
  const rankedVenues = useMemo(() => {
    if (!unlocked) return [];
    const cohorts = [...new Set(cityVenues.map((v) => v.cohort))];
    return cohorts.flatMap((cohort) =>
      buildStackRankings(
        cityVenues.filter((v) => v.cohort === cohort),
        comparisons,
        { cohort }
      ).filter((venue) => venue.hasPersonalRank)
    );
  }, [unlocked, cityVenues, comparisons]);

  const isEmpty = history.length === 0;

  return (
    <ScreenContainer style={styles.screen}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>My List</Text>
        <Text style={styles.subtitle}>Your private record of the nights out you've rated.</Text>

        {/* Ranked area — locked under 5 logs, revealed via the existing Elo at N≥5. */}
        <View style={styles.rankSection}>
          {unlocked ? (
            <>
              <View style={styles.rankHeaderRow}>
                <Text style={styles.sectionTitle}>Your ranked list</Text>
                <Pressable
                  style={styles.rankAgainBtn}
                  onPress={() => router.push('/compare')}
                >
                  <Text style={styles.rankAgainText}>Rank more</Text>
                </Pressable>
              </View>
              {rankedVenues.length > 0 ? (
                <View style={styles.rankedList}>
                  {rankedVenues.map((venue) => (
                    <VenueRow
                      key={venue.id}
                      item={venue}
                      cityKey={cityKey}
                      actionMode="ranked"
                      onPress={() => router.push(`/venue/${venue.id}`)}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.rankPrompt}>
                  <Text style={styles.rankPromptCopy}>
                    Compare a few bars to order your list by taste.
                  </Text>
                  <Pressable style={styles.compareBtn} onPress={() => router.push('/compare')}>
                    <Text style={styles.compareBtnText}>Compare bars</Text>
                  </Pressable>
                </View>
              )}
            </>
          ) : (
            <View style={styles.lockedCard}>
              <View style={styles.lockedIconWrap}>
                <AppIcon name="lock-closed" size={20} color={COLORS.textMuted} />
              </View>
              <Text style={styles.lockedTitle}>rank unlocks at 5 visits</Text>
              <Text style={styles.lockedCopy}>
                Log {unlock.remaining} more {unlock.remaining === 1 ? 'bar' : 'bars'} to reveal your
                personal ranked list — ordered to feel like your own taste.
              </Text>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${(unlock.logCount / unlock.threshold) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressLabel}>{unlock.progressLabel}</Text>
            </View>
          )}
        </View>

        {/* History — the running loved/fine/disliked record (ISC-17). */}
        <Text style={styles.sectionTitle}>History</Text>
        {isEmpty ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Log your first bar</Text>
            <Text style={styles.emptyCopy}>
              Find a bar you've been to and rate it. It saves here, privately — and your ranked
              list unlocks at five.
            </Text>
            <Pressable style={styles.findBtn} onPress={() => router.push('/(tabs)/discover')}>
              <Text style={styles.findBtnText}>Find a bar to log</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.historyList}>
            {history.map((entry) => (
              <Pressable
                key={entry.key}
                style={styles.historyRow}
                onPress={() => router.push(`/venue/${entry.venueId}`)}
              >
                <View style={[styles.sentimentDot, { backgroundColor: SENTIMENT_TONE[entry.sentiment] || COLORS.textMuted }]} />
                <View style={styles.historyCopy}>
                  <Text style={styles.historyName} numberOfLines={1}>{entry.venueName}</Text>
                  <Text style={styles.historyMeta} numberOfLines={1}>
                    {entry.sentimentLabel}
                    {entry.cohort ? ` · ${COHORT_LABELS[entry.cohort] || entry.cohort}` : ''}
                    {entry.visitCount > 1 ? ` · ${entry.visitCount} visits` : ''}
                  </Text>
                </View>
                <AppIcon name="chevron-forward" size={18} color={COLORS.textMuted} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 32 },
  title: {
    color: COLORS.textPrimary, fontSize: 28, fontWeight: '800', marginTop: 8,
  },
  subtitle: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 19, marginTop: 4, marginBottom: 20 },
  sectionTitle: {
    color: COLORS.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 12,
  },

  rankSection: { marginBottom: 28 },
  rankHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
  },
  rankAgainBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rankAgainText: { color: COLORS.accent, fontSize: 13, fontWeight: '700' },
  rankedList: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border },
  rankPrompt: {
    backgroundColor: COLORS.bgElevated, borderRadius: 14, padding: 16,
    borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border,
  },
  rankPromptCopy: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 19, marginBottom: 12 },
  compareBtn: {
    backgroundColor: COLORS.accent, borderRadius: 10, paddingVertical: 11, alignItems: 'center',
  },
  compareBtnText: { color: COLORS.bg, fontWeight: '800', fontSize: 14 },

  lockedCard: {
    backgroundColor: COLORS.bgElevated, borderRadius: 16, padding: 20,
    borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border, alignItems: 'flex-start',
  },
  lockedIconWrap: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.bgCard,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border,
  },
  lockedTitle: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '800', textTransform: 'lowercase' },
  lockedCopy: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 6, marginBottom: 16 },
  progressTrack: {
    height: 8, borderRadius: 4, backgroundColor: COLORS.bgCard, alignSelf: 'stretch', overflow: 'hidden',
  },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: COLORS.accent },
  progressLabel: {
    color: COLORS.textMuted, fontSize: 13, fontWeight: '700', marginTop: 8,
    fontVariant: ['tabular-nums'],
  },

  historyList: {
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border,
  },
  historyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  sentimentDot: { width: 10, height: 10, borderRadius: 5 },
  historyCopy: { flex: 1, paddingRight: 4 },
  historyName: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700', lineHeight: 20 },
  historyMeta: { color: COLORS.textMuted, fontSize: 13, lineHeight: 17, marginTop: 2 },

  emptyCard: {
    backgroundColor: COLORS.bgElevated, borderRadius: 16, padding: 20,
    borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border,
  },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800' },
  emptyCopy: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 6, marginBottom: 16 },
  findBtn: {
    backgroundColor: COLORS.accent, borderRadius: 10, paddingVertical: 12, alignItems: 'center',
  },
  findBtnText: { color: COLORS.bg, fontWeight: '800', fontSize: 14 },
});
