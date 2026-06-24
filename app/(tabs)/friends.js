import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import AppIcon from '../../components/ui/AppIcon';
import { router } from 'expo-router';
import { COLORS } from '../../lib/constants';
import { db } from '../../lib/firebase';
import ScreenContainer from '../../components/ui/ScreenContainer';
import SwipeableRow from '../../components/ui/SwipeableRow';
import { useAuth } from '../../contexts/AuthContext';
import { usePostHog } from 'posthog-react-native';

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
  unhideConversationForSelf,
  pinConversationForSelf,
  unpinConversationForSelf,
  subscribeUserConversations,
} = require('../../lib/friends/dm-service');

export default function FriendsScreen() {
  const { user, reloadProfile } = useAuth();
  const posthog = usePostHog();
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [requestsExpanded, setRequestsExpanded] = useState(false);
  const [hiddenExpanded, setHiddenExpanded] = useState(false);
  const [mutatingRequestId, setMutatingRequestId] = useState(null);
  const viewModel = buildFriendsInboxViewModel(conversations, {}, user?.uid);

  // Keep only one row swiped open at a time: each opening row registers its close fn and we
  // close whichever was open before. Stable identity so the PanResponder closure stays valid.
  const openRowCloser = useRef(null);
  const registerOpen = useRef((closeFn) => {
    if (openRowCloser.current && openRowCloser.current !== closeFn) {
      openRowCloser.current();
    }
    openRowCloser.current = closeFn;
  }).current;

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
      includeHidden: true,
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

  // subscribeUserConversations listens to the `conversations` collection, not
  // `conversationStates`, so pin/hide writes don't re-fire the snapshot. Patch the affected
  // row's state locally so the inbox reflects the change immediately; the Firestore write
  // persists it for cold-start/eventual reads.
  const patchConversationState = (conversationId, patch) => {
    setConversations((rows) => rows.map((row) => (
      row.id === conversationId
        ? { ...row, state: { ...(row.state || {}), ...patch } }
        : row
    )));
  };

  const hideConversation = async (conversationId) => {
    if (!user) return;
    patchConversationState(conversationId, { hiddenAt: new Date() });
    try {
      await hideConversationForSelf({ db, uid: user.uid, conversationId });
    } catch (err) {
      Alert.alert('Hide failed', err.message);
    }
  };

  const unhideConversation = async (conversation) => {
    if (!user) return;
    patchConversationState(conversation.id, { hiddenAt: null });
    try {
      await unhideConversationForSelf({ db, uid: user.uid, conversationId: conversation.id });
    } catch (err) {
      Alert.alert('Unhide failed', err.message);
    }
  };

  const togglePin = async (conversation) => {
    if (!user) return;
    const willPin = !conversation.pinned;
    patchConversationState(conversation.id, { pinnedAt: willPin ? new Date() : null });
    try {
      if (willPin) {
        await pinConversationForSelf({ db, uid: user.uid, conversationId: conversation.id });
      } else {
        await unpinConversationForSelf({ db, uid: user.uid, conversationId: conversation.id });
      }
    } catch (err) {
      Alert.alert('Pin failed', err.message);
    }
  };

  // Pinned chats are circles, not swipeable rows — long-press one to unpin it.
  const handlePinnedLongPress = (conversation) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    togglePin(conversation);
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

  // iMessage pinned chats: a grid of large circular avatars floating above the row list.
  const renderPinnedGrid = (pinned) => (
    <View style={styles.pinnedGrid}>
      {pinned.map((conversation) => (
        <Pressable
          key={conversation.id}
          style={styles.pinnedItem}
          onPress={() => openConversation(conversation)}
          onLongPress={() => handlePinnedLongPress(conversation)}
          delayLongPress={250}
        >
          <View style={styles.pinnedAvatar}>
            <Text style={styles.pinnedAvatarText}>{conversation.displayName.charAt(0).toUpperCase()}</Text>
            {conversation.unread ? <View style={styles.pinnedUnreadDot} /> : null}
          </View>
          <Text style={styles.pinnedName} numberOfLines={1}>{conversation.displayName}</Text>
        </Pressable>
      ))}
    </View>
  );

  // iMessage inbox row: leading unread dot, large avatar, title + 2-line preview, trailing
  // timestamp and chevron, hairline separator inset to the text.
  const renderRowBody = (conversation) => (
    <View style={styles.row}>
      <View style={styles.unreadColumn}>
        {conversation.unread ? <View style={styles.unreadDot} /> : null}
      </View>
      <View style={styles.rowAvatar}>
        <Text style={styles.rowAvatarText}>{conversation.displayName.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTopLine}>
          <Text
            style={[styles.rowTitle, conversation.unread && styles.rowTitleUnread]}
            numberOfLines={1}
          >
            {conversation.displayName}
          </Text>
          <Text style={styles.rowTime}>{conversation.timestamp}</Text>
          <AppIcon name="chevron-forward" size={15} color={COLORS.textMuted} style={styles.rowChevron} />
        </View>
        <Text
          style={[styles.rowPreview, conversation.unread && styles.rowPreviewUnread]}
          numberOfLines={2}
        >
          {conversation.preview}
        </Text>
      </View>
    </View>
  );

  // Visible inbox row: swipe left to reveal Pin/Unpin + Hide.
  const renderConversation = (conversation, index, list) => {
    const isLast = index === list.length - 1;
    return (
      <SwipeableRow
        key={conversation.id}
        registerOpen={registerOpen}
        onPress={() => openConversation(conversation)}
        rightActions={[
          {
            key: 'pin',
            label: conversation.pinned ? 'Unpin' : 'Pin',
            color: COLORS.accent,
            textColor: COLORS.onAccent,
            onPress: () => togglePin(conversation),
          },
          {
            key: 'hide',
            label: 'Hide',
            color: COLORS.danger,
            textColor: '#ffffff',
            onPress: () => hideConversation(conversation.id),
          },
        ]}
      >
        {renderRowBody(conversation)}
        {isLast ? null : <View style={styles.separator} />}
      </SwipeableRow>
    );
  };

  // Hidden chat row: swipe left to Unhide (returns it to the inbox).
  const renderHiddenConversation = (conversation, index, list) => {
    const isLast = index === list.length - 1;
    return (
      <SwipeableRow
        key={conversation.id}
        registerOpen={registerOpen}
        onPress={() => openConversation(conversation)}
        rightActions={[
          {
            key: 'unhide',
            label: 'Unhide',
            color: COLORS.accent,
            textColor: COLORS.onAccent,
            onPress: () => unhideConversation(conversation),
          },
        ]}
      >
        {renderRowBody(conversation)}
        {isLast ? null : <View style={styles.separator} />}
      </SwipeableRow>
    );
  };

  return (
    <ScreenContainer>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title} testID="friends-screen-title">{viewModel.screenTitle}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={viewModel.actions.createChatLabel}
          style={styles.createButton}
          onPress={() => router.push('/conversation/new')}
        >
          <AppIcon name="add" size={26} color={COLORS.bg} />
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

      {viewModel.isEmpty ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <AppIcon name="chatbubbles-outline" size={32} color={COLORS.accent} />
          </View>
          <Text style={styles.emptyTitle}>{viewModel.emptyState.title}</Text>
          <Text style={styles.emptyBody}>{viewModel.emptyState.body}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={viewModel.actions.createChatLabel}
            style={styles.emptyCta}
            onPress={() => router.push('/conversation/new')}
          >
            <Text style={styles.emptyCtaText}>Start a chat</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.inbox}>
          {viewModel.pinned.length > 0 ? renderPinnedGrid(viewModel.pinned) : null}
          <View style={styles.conversationsList}>
            {viewModel.conversations.map(renderConversation)}
          </View>
        </View>
      )}

      {viewModel.hidden.length > 0 ? (
        <View style={styles.hiddenSection}>
          <Pressable
            accessibilityRole="button"
            style={styles.hiddenHeader}
            onPress={() => setHiddenExpanded((expanded) => !expanded)}
          >
            <AppIcon name="lock-closed" size={15} color={COLORS.textMuted} />
            <Text style={styles.hiddenHeaderText}>Hidden</Text>
            <View style={styles.hiddenCount}>
              <Text style={styles.hiddenCountText}>{viewModel.hidden.length}</Text>
            </View>
            <AppIcon
              name={hiddenExpanded ? 'chevron-down' : 'chevron-forward'}
              size={18}
              color={COLORS.textMuted}
            />
          </Pressable>
          {hiddenExpanded ? (
            <View style={styles.conversationsList}>
              {viewModel.hidden.map(renderHiddenConversation)}
            </View>
          ) : null}
        </View>
      ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const PINNED_COLUMNS = 3;
// iMessage keeps content close to the edges; sections inset by SIDE, rows bleed full-width so
// swipe actions reach the screen edge.
const SIDE = 16;

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    backgroundColor: COLORS.bg,
    paddingTop: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: SIDE,
  },
  headerCopy: { flex: 1, paddingRight: 16 },
  title: {
    color: COLORS.textPrimary,
    fontSize: 32,
    fontWeight: '800',
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
    marginBottom: 16,
    marginHorizontal: SIDE,
  },
  requestIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(192, 255, 62, 0.15)',
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
    marginBottom: 16,
    paddingHorizontal: SIDE,
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

  inbox: { flex: 1 },

  // Pinned grid (iMessage-style large circles).
  pinnedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    paddingHorizontal: SIDE - 4,
  },
  pinnedItem: {
    width: `${100 / PINNED_COLUMNS}%`,
    alignItems: 'center',
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  pinnedAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  pinnedAvatarText: { color: COLORS.accent, fontSize: 24, fontWeight: '800' },
  pinnedUnreadDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.accent,
    borderWidth: 2,
    borderColor: COLORS.bg,
  },
  pinnedName: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 96,
  },

  // iMessage-style conversation rows (full-bleed; swipe reveals actions at the screen edge).
  conversationsList: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingLeft: 8,
    paddingRight: 14,
  },
  unreadColumn: {
    width: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.accent,
  },
  rowAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowAvatarText: { color: COLORS.accent, fontSize: 20, fontWeight: '800' },
  rowBody: { flex: 1 },
  rowTopLine: { flexDirection: 'row', alignItems: 'center' },
  rowTitle: { flex: 1, color: COLORS.textPrimary, fontSize: 16, fontWeight: '600' },
  rowTitleUnread: { fontWeight: '800' },
  rowTime: { color: COLORS.textMuted, fontSize: 13, marginLeft: 8 },
  rowChevron: { marginLeft: 2 },
  rowPreview: { color: COLORS.textMuted, fontSize: 14, lineHeight: 19, marginTop: 2, paddingRight: 18 },
  rowPreviewUnread: { color: COLORS.textSecondary },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
    marginLeft: 88,
  },

  // Collapsible "Hidden" section at the bottom of the inbox.
  hiddenSection: { marginTop: 12 },
  hiddenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: SIDE,
    paddingVertical: 12,
  },
  hiddenHeaderText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '700',
  },
  hiddenCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: COLORS.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 'auto',
  },
  hiddenCountText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },

  emptyCard: {
    flex: 1,
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(192, 255, 62, 0.15)',
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
  emptyCta: {
    marginTop: 22,
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 13,
  },
  emptyCtaText: {
    color: COLORS.bg,
    fontSize: 14,
    fontWeight: '800',
  },
});
