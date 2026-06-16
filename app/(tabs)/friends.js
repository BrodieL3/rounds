import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AppIcon from '../../components/ui/AppIcon';
import { router } from 'expo-router';
import { COLORS } from '../../lib/constants';
import { db } from '../../lib/firebase';
import ScreenContainer from '../../components/ui/ScreenContainer';
import { useAuth } from '../../contexts/AuthContext';

const {
  FRIENDS_EMPTY_INBOX,
  buildFriendsInboxViewModel,
} = require('../../lib/friends/inbox-display');
const {
  acceptFriendRequest,
  declineFriendRequest,
  subscribeIncomingFriendRequests,
} = require('../../lib/friends/friendship-service');
const {
  hideConversationForSelf,
  subscribeUserConversations,
} = require('../../lib/friends/dm-service');

export default function FriendsScreen() {
  const { user, reloadProfile } = useAuth();
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [requestsExpanded, setRequestsExpanded] = useState(false);
  const [mutatingRequestId, setMutatingRequestId] = useState(null);
  const [hidingConversationId, setHidingConversationId] = useState(null);
  const viewModel = buildFriendsInboxViewModel(conversations);

  useEffect(() => {
    if (!user) return undefined;

    return subscribeIncomingFriendRequests({
      db,
      uid: user.uid,
      onChange: setIncomingRequests,
      onError: (err) => console.error('Friend requests snapshot error:', err),
    });
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;

    return subscribeUserConversations({
      db,
      uid: user.uid,
      onChange: setConversations,
      onError: (err) => console.error('Conversation inbox snapshot error:', err),
    });
  }, [user]);

  const requestSummary = incomingRequests.length === 0
    ? FRIENDS_EMPTY_INBOX.friendRequestsEmpty
    : `${incomingRequests.length} pending requests`;

  const respondToRequest = async (request, action) => {
    if (!user) return;
    setMutatingRequestId(request.id);
    try {
      if (action === 'accept') {
        await acceptFriendRequest({ db, fromUid: request.fromUid, toUid: user.uid });
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

  const hideConversation = async (conversationId) => {
    if (!user) return;
    setHidingConversationId(conversationId);
    try {
      await hideConversationForSelf({ db, uid: user.uid, conversationId });
    } catch (err) {
      Alert.alert('Hide failed', err.message);
    } finally {
      setHidingConversationId(null);
    }
  };

  const openConversation = (conversation) => {
    router.push({
      pathname: '/conversation/[id]',
      params: { id: conversation.id, otherUid: conversation.otherUid },
    });
  };

  const renderIncomingRequest = (request) => {
    const fromUser = request.fromUser || {};
    const displayName = fromUser.displayName || fromUser.username || request.fromUid;
    const username = fromUser.username ? `@${fromUser.username}` : 'Incoming request';
    const disabled = mutatingRequestId === request.id;

    return (
      <View key={request.id} style={styles.requestRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.requestUserCopy}>
          <Text style={styles.requestUserName}>{displayName}</Text>
          <Text style={styles.requestUserHandle}>{username}</Text>
        </View>
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

  const renderConversation = (conversation) => {
    const disabled = hidingConversationId === conversation.id;

    return (
      <View key={conversation.id} style={styles.conversationRow}>
        <Pressable style={styles.conversationMain} onPress={() => openConversation(conversation)}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{conversation.displayName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.conversationCopy}>
            <Text style={styles.conversationTitle}>{conversation.displayName}</Text>
            <Text style={styles.conversationPreview} numberOfLines={1}>{conversation.preview}</Text>
          </View>
        </Pressable>
        <Pressable
          style={styles.hideBtn}
          disabled={disabled}
          onPress={() => hideConversation(conversation.id)}
        >
          <Text style={styles.hideText}>Hide</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <ScreenContainer>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title} testID="friends-screen-title">{viewModel.screenTitle}</Text>
          <Text style={styles.subtitle}>{viewModel.screenSubtitle}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={viewModel.actions.createChatLabel}
          style={styles.createButton}
          onPress={() => router.push('/conversation/new')}
        >
          <AppIcon name="add" size={26} color="#ffffff" />
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        style={styles.requestCard}
        onPress={() => setRequestsExpanded((expanded) => !expanded)}
      >
        <View style={styles.requestIcon}>
          <AppIcon name="person-add-outline" size={20} color={COLORS.accent} />
        </View>
        <View style={styles.requestCopy}>
          <Text style={styles.requestTitle}>{viewModel.actions.friendRequestsLabel}</Text>
          <Text style={styles.requestSub}>{requestSummary}</Text>
        </View>
        <AppIcon
          name={requestsExpanded ? 'chevron-down' : 'chevron-forward'}
          size={20}
          color={COLORS.textMuted}
        />
      </Pressable>

      {requestsExpanded && incomingRequests.length > 0 ? (
        <View style={styles.requestsList}>
          {incomingRequests.map(renderIncomingRequest)}
        </View>
      ) : null}

      <View style={styles.inboxHeader}>
        <Text style={styles.sectionTitle}>{viewModel.inboxTitle}</Text>
      </View>

      {viewModel.isEmpty ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <AppIcon name="chatbubbles-outline" size={32} color={COLORS.accent} />
          </View>
          <Text style={styles.emptyTitle}>{viewModel.emptyState.title}</Text>
          <Text style={styles.emptyBody}>{viewModel.emptyState.body}</Text>
        </View>
      ) : (
        <View style={styles.conversationsList}>
          {viewModel.conversations.map(renderConversation)}
        </View>
      )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerCopy: { flex: 1, paddingRight: 16 },
  title: {
    color: COLORS.textPrimary,
    fontSize: 32,
    fontWeight: '800',
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 6,
  },
  createButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.hero,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestCard: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  requestIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f4e7f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  requestCopy: { flex: 1 },
  requestTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  requestSub: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 3,
  },
  requestsList: {
    gap: 10,
    marginBottom: 24,
  },
  requestRow: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: COLORS.accent, fontSize: 16, fontWeight: '800' },
  requestUserCopy: { flex: 1 },
  requestUserName: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '800' },
  requestUserHandle: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  requestActions: { flexDirection: 'row', gap: 8 },
  responseBtn: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8 },
  declineBtn: { backgroundColor: COLORS.bgCard },
  acceptBtn: { backgroundColor: COLORS.accent },
  declineText: { color: COLORS.textMuted, fontWeight: '800', fontSize: 12 },
  acceptText: { color: '#ffffff', fontWeight: '800', fontSize: 12 },
  inboxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 12,
  },
  conversationsList: { gap: 10 },
  conversationRow: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  conversationMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  conversationCopy: { flex: 1 },
  conversationTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '800' },
  conversationPreview: { color: COLORS.textMuted, fontSize: 13, marginTop: 3 },
  hideBtn: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: COLORS.bgCard,
  },
  hideText: { color: COLORS.textMuted, fontWeight: '800', fontSize: 12 },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  emptyCard: {
    flex: 1,
    minHeight: 280,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f4e7f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyBody: {
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});
