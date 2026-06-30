import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import GlassBackButton from '../components/ui/GlassBackButton';
import ScreenContainer from '../components/ui/ScreenContainer';
import { COLORS } from '../lib/constants';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

const {
  acceptFriendRequest,
  declineFriendRequest,
  subscribeIncomingFriendRequests,
} = require('../lib/friends/friendship-service');

export default function FriendRequestsScreen() {
  const { user, reloadProfile } = useAuth();
  const posthog = usePostHog();
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [mutatingRequestId, setMutatingRequestId] = useState(null);

  useEffect(() => {
    if (!user) return undefined;

    return subscribeIncomingFriendRequests({
      db,
      uid: user.uid,
      onChange: setIncomingRequests,
      onError: (err) => console.error('Friend requests snapshot error:', err),
    });
  }, [user]);

  const respondToRequest = async (request, action) => {
    if (!user) return;
    setMutatingRequestId(request.id);
    try {
      if (action === 'accept') {
        await acceptFriendRequest({ db, fromUid: request.fromUid, toUid: user.uid });
        posthog.capture('friend_request_accepted', { from_uid: request.fromUid });
        await reloadProfile?.();
      } else {
        await declineFriendRequest({ db, fromUid: request.fromUid, toUid: user.uid });
      }
    } catch (err) {
      Alert.alert('Friend request failed', err.message);
    } finally {
      setMutatingRequestId(null);
    }
  };

  const openRequesterProfile = (request) => {
    const username = request.fromUser?.username;
    if (username) router.push({ pathname: '/user/[username]', params: { username } });
  };

  const renderIncomingRequest = ({ item: request }) => {
    const fromUser = request.fromUser || {};
    const displayName = fromUser.displayName || fromUser.username || request.fromUid;
    const username = fromUser.username ? `@${fromUser.username}` : 'Incoming request';
    const disabled = mutatingRequestId === request.id;

    return (
      <View style={styles.requestRow}>
        <Pressable style={styles.requestMain} onPress={() => openRequesterProfile(request)}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.requestUserCopy}>
            <Text style={styles.requestUserName}>{displayName}</Text>
            <Text style={styles.requestUserHandle}>{username}</Text>
          </View>
        </Pressable>
        <View style={styles.requestActions}>
          <Pressable
            style={[styles.responseBtn, styles.declineBtn]}
            disabled={disabled}
            onPress={() => respondToRequest(request, 'decline')}
          >
            <Text style={styles.declineText}>Decline</Text>
          </Pressable>
          <Pressable
            style={[styles.responseBtn, styles.acceptBtn]}
            disabled={disabled}
            onPress={() => respondToRequest(request, 'accept')}
          >
            <Text style={styles.acceptText}>Accept</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <GlassBackButton onPress={() => router.back()} />
        <Text style={styles.title}>Friend requests</Text>
      </View>

      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={incomingRequests}
        renderItem={renderIncomingRequest}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={(
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No pending requests</Text>
            <Text style={styles.emptyBody}>When someone sends you a friend request, it shows up here.</Text>
          </View>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '800', flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 24, gap: 10 },
  requestRow: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  requestMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: COLORS.accent, fontSize: 16, fontWeight: '800' },
  requestUserCopy: { flex: 1 },
  requestUserName: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '800' },
  requestUserHandle: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  requestActions: { flexDirection: 'row', gap: 8 },
  responseBtn: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 },
  declineBtn: { backgroundColor: COLORS.bgCard },
  acceptBtn: { backgroundColor: COLORS.accent },
  declineText: { color: COLORS.textMuted, fontWeight: '800', fontSize: 13 },
  acceptText: { color: COLORS.onAccent, fontWeight: '800', fontSize: 13 },
  emptyCard: {
    marginTop: 40,
    alignItems: 'center',
    padding: 28,
  },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '800', marginBottom: 8 },
  emptyBody: { color: COLORS.textSecondary, fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
