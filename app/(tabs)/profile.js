import { useState, useCallback, useMemo } from 'react';
import { Alert, Image, Share, StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getCountFromServer, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS } from '../../lib/constants';
import { buildStackRankings } from '../../lib/personal-rankings';
import VenueRow from '../../components/VenueRow';

const VENUE_DATA = require('../../assets/venues.json');

const BLUE = '#4f93f7';
const LINK_BLUE = '#155e6d';
const BORDER = '#dedede';

const SUGGESTED_USERS = [
  {
    id: 'emily',
    fullName: 'Emily Ginsburg',
    avatarUrl: 'https://i.pravatar.cc/240?img=47',
  },
  {
    id: 'eliot',
    fullName: 'Eliot Frost',
    avatarUrl: 'https://i.pravatar.cc/240?img=12',
  },
  {
    id: 'ava',
    fullName: 'Ava Morgan',
    avatarUrl: 'https://i.pravatar.cc/240?img=32',
  },
];

function formatMemberSince(createdAt) {
  const raw = createdAt?.toDate?.() || createdAt;
  const date = raw ? new Date(raw) : new Date();
  if (Number.isNaN(date.getTime())) return 'Member since today';
  return `Member since ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
}

function ProfileAvatar({ profile, user, size = 88 }) {
  const letter = (profile?.displayName || profile?.username || user?.email || '?').charAt(0).toUpperCase();
  const avatarStyle = { width: size, height: size, borderRadius: size / 2 };

  if (profile?.photoURL) {
    return <Image source={{ uri: profile.photoURL }} style={[styles.avatarImage, avatarStyle]} />;
  }

  return (
    <View style={[styles.avatar, avatarStyle]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.42 }]}>{letter}</Text>
    </View>
  );
}

function StatBlock({ value, label, locked }) {
  return (
    <View style={styles.stat}>
      <View style={styles.statValueWrap}>
        {locked ? (
          <Ionicons name="lock-closed" size={16} color={COLORS.textPrimary} />
        ) : (
          <Text style={styles.statNum}>{value}</Text>
        )}
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SuggestedUserCard({ item, onDismiss }) {
  return (
    <View style={styles.suggestionCard}>
      <Pressable style={styles.dismissBtn} onPress={() => onDismiss(item.id)}>
        <Ionicons name="close" size={18} color="#9ca3af" />
      </Pressable>
      <Image source={{ uri: item.avatarUrl }} style={styles.suggestionAvatar} />
      <Text style={styles.suggestionName} numberOfLines={1}>{item.fullName}</Text>
      <Text style={styles.suggestionLabel}>Suggested for you</Text>
      <Pressable style={styles.followBtn}>
        <Text style={styles.followBtnText}>Follow</Text>
      </Pressable>
    </View>
  );
}

function ProfileActivityRow({ icon, label, count, locked, onPress }) {
  return (
    <Pressable style={styles.activityRow} onPress={onPress}>
      <Ionicons name={icon} size={22} color={COLORS.textPrimary} style={styles.activityIcon} />
      <Text style={styles.activityLabel}>{label}</Text>
      <View style={styles.activitySpacer} />
      {locked ? (
        <Ionicons name="lock-closed" size={18} color="#cfcfcf" style={styles.activityCount} />
      ) : (
        <Text style={styles.activityCount}>{count}</Text>
      )}
      <Ionicons name="chevron-forward" size={20} color="#c7c7c7" />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { user, profile, signOut, reloadProfile } = useAuth();
  const [stats, setStats] = useState({ been: 0 });
  const [comparisons, setComparisons] = useState([]);
  const [hiddenSuggestionIds, setHiddenSuggestionIds] = useState([]);

  const cityKey = profile?.city || 'nyc';
  const cityVenues = VENUE_DATA.cities[cityKey]?.venues || [];
  const personalList = useMemo(
    () => buildStackRankings(cityVenues, comparisons).filter((venue) => venue.hasPersonalRank),
    [cityVenues, comparisons]
  );

  const loadData = useCallback(async () => {
    if (!user) {
      setStats({ been: 0 });
      setComparisons([]);
      return;
    }
    try {
      const ratingsQ = query(collection(db, 'ratings'), where('userId', '==', user.uid));
      const comparisonsQ = query(collection(db, 'comparisons'), where('userId', '==', user.uid));
      const [ratingsSnap, comparisonsSnap] = await Promise.all([
        getCountFromServer(ratingsQ),
        getDocs(comparisonsQ),
      ]);
      setStats({ been: ratingsSnap.data().count });
      setComparisons(comparisonsSnap.docs.map((doc) => doc.data()));
    } catch (err) {
      console.error('Profile load error:', err);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      reloadProfile();
    }, [loadData, reloadProfile])
  );

  const handleShareProfile = async () => {
    const handle = profile?.username ? `@${profile.username}` : 'my Rounds profile';
    try {
      await Share.share({ message: `Follow ${handle} on Rounds.` });
    } catch (err) {
      Alert.alert('Share failed', err.message);
    }
  };

  const handleMenu = () => {
    Alert.alert('Profile menu', 'Choose an action.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/onboarding/phone');
        },
      },
    ]);
  };

  const visibleSuggestions = SUGGESTED_USERS.filter((item) => !hiddenSuggestionIds.includes(item.id));
  const followers = (profile?.followers || []).length;
  const following = (profile?.following || []).length;

  return (
    <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
      <View style={styles.topBar}>
        <Text style={styles.topName}>{profile?.displayName || 'User'}</Text>
        <View style={styles.topActions}>
          <Pressable style={styles.iconBtn} onPress={handleShareProfile}>
            <Ionicons name="share-outline" size={24} color={COLORS.textPrimary} />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={handleMenu}>
            <Ionicons name="menu-outline" size={28} color={COLORS.textPrimary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.identityBlock}>
        <ProfileAvatar profile={profile} user={user} />
        <Text style={styles.username}>@{profile?.username || 'username'}</Text>
        <Text style={styles.memberSince}>{formatMemberSince(profile?.createdAt)}</Text>
        <Pressable>
          <Text style={styles.addSchool}>+ Add School</Text>
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <StatBlock value={followers} label="Followers" />
        <StatBlock value={following} label="Following" />
        <StatBlock label="Rank status" locked />
      </View>

      <View style={styles.actionRow}>
        <Pressable style={styles.outlineBtn} onPress={() => router.push('/edit-profile')}>
          <Text style={styles.outlineBtnText}>Edit profile</Text>
        </Pressable>
        <Pressable style={styles.outlineBtn} onPress={handleShareProfile}>
          <Text style={styles.outlineBtnText}>Share profile</Text>
        </Pressable>
        <Pressable style={styles.chevronBox}>
          <Ionicons name="chevron-down" size={18} color={COLORS.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.personalListSection}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Your list</Text>
            <Text style={styles.sectionSub}>Ranked from your comparisons</Text>
          </View>
        </View>

        {personalList.length > 0 ? (
          <View style={styles.personalList}>
            {personalList.map((venue) => (
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
          <View style={styles.emptyList}>
            <Text style={styles.emptyListTitle}>No ranked spots yet</Text>
            <Text style={styles.emptyListCopy}>Compare venues to build your personal list.</Text>
          </View>
        )}
      </View>

      <View style={styles.suggestHeader}>
        <Text style={styles.suggestTitle}>Suggested for you</Text>
        <Pressable onPress={() => router.push('/search')}>
          <Text style={styles.seeAll}>See all</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.suggestionsList}
      >
        {visibleSuggestions.map((item) => (
          <SuggestedUserCard
            key={item.id}
            item={item}
            onDismiss={(id) => setHiddenSuggestionIds((current) => [...current, id])}
          />
        ))}
      </ScrollView>

      <View style={styles.activityList}>
        <ProfileActivityRow
          icon="checkmark-circle-outline"
          label="Been"
          count={stats.been}
          onPress={() => router.push('/(tabs)/list')}
        />
        <ProfileActivityRow
          icon="ribbon"
          label="Want to Try"
          count={(profile?.wantToTry || []).length}
          onPress={() => router.push('/(tabs)/list')}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    backgroundColor: COLORS.bg,
    paddingTop: 48,
    paddingBottom: 28,
  },
  topBar: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topName: { color: COLORS.textPrimary, fontSize: 28, fontWeight: '800' },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBtn: { paddingVertical: 4, paddingLeft: 6 },
  identityBlock: { alignItems: 'center', marginTop: 18 },
  avatar: {
    backgroundColor: COLORS.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  avatarImage: { backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: BORDER },
  avatarText: { color: COLORS.accent, fontWeight: '900' },
  username: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800', marginTop: 14 },
  memberSince: { color: '#9ca3af', fontSize: 13, marginTop: 4 },
  addSchool: { color: LINK_BLUE, fontSize: 14, fontWeight: '700', marginTop: 6 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginTop: 18,
    marginBottom: 16,
  },
  stat: { alignItems: 'center', flex: 1 },
  statValueWrap: { height: 22, alignItems: 'center', justifyContent: 'center' },
  statNum: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800' },
  statLabel: { color: '#9ca3af', fontSize: 13, marginTop: 2, textAlign: 'center' },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 22,
  },
  outlineBtn: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderColor: '#d4d4d4',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  chevronBox: {
    width: 44,
    height: 42,
    borderWidth: 1,
    borderColor: '#d4d4d4',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personalListSection: { paddingHorizontal: 20, marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800' },
  sectionSub: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18, marginTop: 2 },
  personalList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
  },
  emptyList: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    backgroundColor: COLORS.bgElevated,
  },
  emptyListTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800' },
  emptyListCopy: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 4 },
  suggestHeader: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  suggestTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800' },
  seeAll: { color: LINK_BLUE, fontSize: 14, fontWeight: '800' },
  suggestionsList: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  suggestionCard: {
    width: 134,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingTop: 20,
    paddingHorizontal: 10,
    paddingBottom: 10,
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  dismissBtn: { position: 'absolute', top: 10, right: 10, zIndex: 1 },
  suggestionAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 12,
  },
  suggestionName: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '800', maxWidth: '100%' },
  suggestionLabel: { color: '#9ca3af', fontSize: 12, marginTop: 4, marginBottom: 10 },
  followBtn: {
    backgroundColor: BLUE,
    borderRadius: 8,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  followBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800', letterSpacing: 0.8 },
  activityList: { borderTopWidth: 1, borderTopColor: BORDER },
  activityRow: {
    minHeight: 54,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  activityIcon: { width: 36 },
  activityLabel: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800' },
  activitySpacer: { flex: 1 },
  activityCount: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800', marginRight: 12 },
});
