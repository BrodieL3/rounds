import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, Pressable, ScrollView, FlatList, Alert,
} from 'react-native';
import AppIcon from '../../components/ui/AppIcon';
import { useLocalSearchParams, router } from 'expo-router';
import {
  collection, query, where, getDocs, getDoc, doc, updateDoc, arrayUnion, arrayRemove, limit,
} from 'firebase/firestore';
import { db, functions as cloudFunctions } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS } from '../../lib/constants';
import MediaImage from '../../components/ui/media-image';
import GlassBackButton from '../../components/ui/GlassBackButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  getFriendshipCta,
  loadFriendshipStatus,
  sendFriendRequest,
} = require('../../lib/friends/friendship-service');
const { buildDirectMessageRouteParams } = require('../../lib/friends/dm-service');
const {
  blockUser,
  buildReportPayload,
  reportTarget,
} = require('../../lib/friends/safety-service');

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { user: currentUser, reloadProfile } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [friendshipStatus, setFriendshipStatus] = useState('none');
  const [friendshipMutating, setFriendshipMutating] = useState(false);
  const [stats, setStats] = useState({ venues: 0, comparisons: 0 });
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshFriendshipStatus = useCallback(async (targetUid) => {
    if (!currentUser || !targetUid || currentUser.uid === targetUid) {
      setFriendshipStatus(currentUser?.uid === targetUid ? 'self' : 'none');
      return;
    }

    const status = await loadFriendshipStatus({
      db,
      viewerUid: currentUser.uid,
      otherUid: targetUid,
    });
    setFriendshipStatus(status);
  }, [currentUser]);

  const loadUser = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), where('username', '==', username), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) {
        setProfile(null);
        setLoading(false);
        return;
      }

      // The doc id IS the uid; carry it so `data.uid` (follow, friend request,
      // DM route params, the ratings query below) is never undefined for a
      // profile doc written without an explicit uid field.
      const data = { ...snap.docs[0].data(), uid: snap.docs[0].id };
      setProfile(data);

      const currentSnap = currentUser ? await getDoc(doc(db, 'users', currentUser.uid)) : null;
      const currentData = currentSnap?.data();
      setIsFollowing(currentData?.following?.includes(data.uid) || false);
      await refreshFriendshipStatus(data.uid);

      const viewingSelf = currentUser?.uid === data.uid;
      const ratingsQ = viewingSelf
        ? query(collection(db, 'ratings'), where('userId', '==', data.uid))
        : query(collection(db, 'ratings'), where('userId', '==', data.uid), where('visibility', '==', 'public'));
      const ratingsSnap = await getDocs(ratingsQ);
      const venueCount = ratingsSnap.size;

      const comparisonsQ = query(collection(db, 'comparisons'), where('userId', '==', data.uid));
      const comparisonsSnap = await getDocs(comparisonsQ);
      const comparisonCount = comparisonsSnap.size;

      setStats({ venues: venueCount, comparisons: comparisonCount });

      const recentQ = viewingSelf
        ? query(
          collection(db, 'ratings'),
          where('userId', '==', data.uid),
          limit(10)
        )
        : query(
          collection(db, 'ratings'),
          where('userId', '==', data.uid),
          where('visibility', '==', 'public'),
          limit(10)
        );
      const recentSnap = await getDocs(recentQ);
      const recent = recentSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setReviews(recent);
    } catch (err) {
      console.error('User profile load error:', err);
    } finally {
      setLoading(false);
    }
  }, [username, currentUser, refreshFriendshipStatus]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const toggleFollow = async () => {
    if (!currentUser || !profile) return;
    try {
      const currentRef = doc(db, 'users', currentUser.uid);
      const targetRef = doc(db, 'users', profile.uid);

      if (isFollowing) {
        await updateDoc(currentRef, { following: arrayRemove(profile.uid) });
        await updateDoc(targetRef, { followers: arrayRemove(currentUser.uid) });
        setIsFollowing(false);
      } else {
        await updateDoc(currentRef, { following: arrayUnion(profile.uid) });
        await updateDoc(targetRef, { followers: arrayUnion(currentUser.uid) });
        setIsFollowing(true);
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const acceptIncomingRequest = async () => {
    if (!currentUser || !profile) return;
    setFriendshipMutating(true);
    try {
      await acceptFriendRequest({ db, fromUid: profile.uid, toUid: currentUser.uid });
      setFriendshipStatus('friends');
      setIsFollowing(true);
      await reloadProfile?.();
    } catch (err) {
      Alert.alert('Friend request failed', err.message);
    } finally {
      setFriendshipMutating(false);
    }
  };

  const declineIncomingRequest = async () => {
    if (!currentUser || !profile) return;
    setFriendshipMutating(true);
    try {
      await declineFriendRequest({ db, fromUid: profile.uid, toUid: currentUser.uid });
      setFriendshipStatus('none');
    } catch (err) {
      Alert.alert('Friend request failed', err.message);
    } finally {
      setFriendshipMutating(false);
    }
  };

  const handleFriendshipAction = async () => {
    if (!currentUser || !profile || friendshipMutating) return;
    const cta = getFriendshipCta(friendshipStatus);

    if (cta.action === 'respond_request') {
      Alert.alert('Respond to friend request', `Accept ${profile.displayName || profile.username}'s request?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Decline', style: 'destructive', onPress: declineIncomingRequest },
        { text: 'Accept', onPress: acceptIncomingRequest },
      ]);
      return;
    }

    setFriendshipMutating(true);
    try {
      if (cta.action === 'send_request') {
        await sendFriendRequest({ db, fromUid: currentUser.uid, toUid: profile.uid });
        setFriendshipStatus('outgoing_pending');
      } else if (cta.action === 'cancel_request') {
        await cancelFriendRequest({ db, fromUid: currentUser.uid, toUid: profile.uid });
        setFriendshipStatus('none');
      }
    } catch (err) {
      Alert.alert('Friend request failed', err.message);
    } finally {
      setFriendshipMutating(false);
    }
  };

  const handleMessagePress = () => {
    if (!currentUser || !profile) return;
    router.push(buildDirectMessageRouteParams(currentUser.uid, profile.uid));
  };

  const handleReportUser = async () => {
    if (!currentUser || !profile) return;
    try {
      const report = buildReportPayload({
        reporterUid: currentUser.uid,
        targetType: 'user',
        targetId: profile.uid,
        reportedUid: profile.uid,
        reason: 'Reported from profile',
        createdAt: new Date(),
      });
      await reportTarget({ db, report });
      Alert.alert('Report submitted', 'Thanks. We will review this user.');
    } catch (err) {
      Alert.alert('Report failed', err.message);
    }
  };

  const handleBlockUser = () => {
    if (!currentUser || !profile) return;
    Alert.alert('Block user?', 'This removes Friendship and follows both ways, and prevents future messages or requests.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block user',
        style: 'destructive',
        onPress: async () => {
          try {
            await blockUser({ functions: cloudFunctions, blockedUid: profile.uid });
            setFriendshipStatus('blocked_by_me');
            setIsFollowing(false);
            await reloadProfile?.();
          } catch (err) {
            Alert.alert('Block failed', err.message);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Loading...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>User not found</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const isSelf = currentUser?.uid === profile.uid;
  const friendshipCta = getFriendshipCta(friendshipStatus);

  const renderReview = ({ item }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewVenue}>{item.venueName || item.venueId}</Text>
        {isSelf && (
          <Pressable
            style={styles.reviewShareBtn}
            onPress={() => router.push({
              pathname: '/conversation/share-review',
              params: {
                ratingId: item.id,
                venueId: item.venueId,
                venueName: item.venueName,
                venueCohort: item.cohort,
                sentiment: item.sentiment,
                authorDisplayName: item.displayName,
                authorUsername: item.username,
                notes: item.notes || item.description || '',
                visibility: item.visibility,
              },
            })}
          >
            <AppIcon name="paper-plane-outline" size={16} color={COLORS.accent} />
          </Pressable>
        )}
      </View>
      <Text style={styles.reviewMeta}>
        {item.sentiment === 'loved' ? 'Loved it' : item.sentiment === 'fine' ? 'It was fine' : "Didn't like it"}
        {item.visibility && item.visibility !== 'public' ? ` · ${item.visibility}` : ''}
      </Text>
      {(item.notes || item.description) ? (
        <Text style={styles.reviewDesc}>{item.notes || item.description}</Text>
      ) : null}
    </View>
  );

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scrollFill} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        {profile?.photoURL ? (
          <MediaImage source={{ uri: profile.photoURL }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(profile.displayName || profile.username || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={styles.name}>{profile.displayName || profile.username}</Text>
        <Text style={styles.username}>@{profile.username}</Text>

        {!isSelf && (
          <View style={styles.actionRow}>
            <Pressable
              style={[styles.followBtn, isFollowing && styles.followBtnActive]}
              onPress={toggleFollow}
            >
              <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.friendBtn, friendshipCta.disabled && styles.friendBtnDisabled]}
              onPress={handleFriendshipAction}
              disabled={friendshipMutating || friendshipCta.disabled}
            >
              <Text style={styles.friendBtnText}>{friendshipCta.label}</Text>
            </Pressable>
            {friendshipCta.showMessage ? (
              <Pressable style={styles.messageBtn} onPress={handleMessagePress}>
                <Text style={styles.messageBtnText}>Message</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.reportUserBtn} onPress={handleReportUser}>
              <Text style={styles.reportUserBtnText}>Report user</Text>
            </Pressable>
            <Pressable style={styles.blockUserBtn} onPress={handleBlockUser}>
              <Text style={styles.blockUserBtnText}>Block user</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{stats.venues}</Text>
          <Text style={styles.statLabel}>Venues</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{stats.comparisons}</Text>
          <Text style={styles.statLabel}>Comparisons</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{(profile.followers || []).length}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{(profile.following || []).length}</Text>
          <Text style={styles.statLabel}>Following</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Recent reviews</Text>
      {reviews.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No reviews yet</Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          renderItem={renderReview}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={{ paddingBottom: 12 }}
        />
      )}
      </ScrollView>
      <GlassBackButton onPress={() => router.back()} style={[styles.floatingBack, { top: insets.top + 6 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  scrollFill: { flex: 1, backgroundColor: COLORS.bg },
  floatingBack: { position: 'absolute', left: 12 },
  screen: { flexGrow: 1, backgroundColor: COLORS.bg, paddingTop: 56, paddingHorizontal: 24, paddingBottom: 24 },
  title: { color: COLORS.textPrimary, fontSize: 28, fontWeight: '800', marginTop: 16 },
  header: { alignItems: 'center', marginTop: 24, marginBottom: 24 },
  avatar: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: COLORS.bgElevated,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  avatarImage: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: COLORS.bgElevated,
    marginBottom: 16,
  },
  avatarText: { color: COLORS.accent, fontSize: 40, fontWeight: '800' },
  name: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '800' },
  username: { color: COLORS.textMuted, fontSize: 16, marginTop: 4 },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  followBtn: {
    backgroundColor: COLORS.hero, paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 20,
  },
  followBtnActive: { backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.textMuted },
  followBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  followBtnTextActive: { color: COLORS.textMuted },
  friendBtn: {
    backgroundColor: COLORS.accent, paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 20,
  },
  friendBtnDisabled: { backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.textMuted },
  friendBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  messageBtn: {
    backgroundColor: COLORS.bgElevated, paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.accent,
  },
  messageBtnText: { color: COLORS.accent, fontWeight: '800', fontSize: 14 },
  reportUserBtn: {
    backgroundColor: COLORS.bgElevated, paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.textMuted,
  },
  reportUserBtnText: { color: COLORS.textMuted, fontWeight: '800', fontSize: 14 },
  blockUserBtn: {
    backgroundColor: COLORS.bgCard, paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.danger,
  },
  blockUserBtnText: { color: COLORS.danger, fontWeight: '800', fontSize: 14 },
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: COLORS.bgElevated, borderRadius: 16,
    padding: 16, marginBottom: 24,
  },
  stat: { alignItems: 'center' },
  statNum: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '800' },
  statLabel: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  sectionTitle: {
    color: COLORS.textSecondary, fontSize: 16, fontWeight: '700', marginBottom: 12,
  },
  reviewCard: {
    backgroundColor: COLORS.bgElevated, padding: 16, borderRadius: 16, marginBottom: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewVenue: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700', flex: 1 },
  reviewShareBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewMeta: { color: COLORS.textMuted, fontSize: 13, marginTop: 2 },
  reviewDesc: { color: COLORS.textSecondary, fontSize: 14, marginTop: 6 },
  emptyCard: {
    backgroundColor: COLORS.bgElevated, padding: 24, borderRadius: 16, alignItems: 'center',
  },
  emptyText: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700' },
  backBtn: {
    marginTop: 16, backgroundColor: COLORS.bgElevated,
    padding: 16, borderRadius: 12, alignItems: 'center',
  },
  backBtnText: { color: COLORS.accent, fontWeight: '700', fontSize: 16 },
});
