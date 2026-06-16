import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import AppIcon from '../../components/ui/AppIcon';
import { COLORS, COHORT_LABELS } from '../../lib/constants';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { getVenueVisualFallback } from '../../lib/venue-visuals';

const { subscribeUserConversations } = require('../../lib/friends/dm-service');
const {
  sendDirectReviewLinkMessage,
  sendGroupReviewLinkMessage,
} = require('../../lib/friends/review-link-service');

const { httpsCallable } = require('firebase/functions');
const { functions } = require('../../lib/firebase');

export default function ShareReviewScreen() {
  const {
    ratingId, venueId, venueName, venueCohort, sentiment,
    authorDisplayName, authorUsername, notes, visibility,
  } = useLocalSearchParams();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [sendingConversationId, setSendingConversationId] = useState(null);

  const review = useMemo(() => {
    const normalizedSentiment = Array.isArray(sentiment) ? sentiment[0] : sentiment;
    const normalizedNotes = Array.isArray(notes) ? notes[0] : notes;
    const normalizedAuthorDisplayName = Array.isArray(authorDisplayName) ? authorDisplayName[0] : authorDisplayName;
    const normalizedAuthorUsername = Array.isArray(authorUsername) ? authorUsername[0] : authorUsername;
    const normalizedVenueName = Array.isArray(venueName) ? venueName[0] : venueName;
    const normalizedVenueCohort = Array.isArray(venueCohort) ? venueCohort[0] : venueCohort;
    const normalizedRatingId = Array.isArray(ratingId) ? ratingId[0] : ratingId;
    const normalizedVenueId = Array.isArray(venueId) ? venueId[0] : venueId;
    const normalizedVisibility = Array.isArray(visibility) ? visibility[0] : visibility;

    return {
      ratingId: normalizedRatingId,
      venueId: normalizedVenueId,
      venueName: normalizedVenueName,
      venueCohort: normalizedVenueCohort,
      sentiment: normalizedSentiment,
      authorDisplayName: normalizedAuthorDisplayName,
      authorUsername: normalizedAuthorUsername,
      notes: normalizedNotes,
      visibility: normalizedVisibility || 'public',
    };
  }, [ratingId, venueId, venueName, venueCohort, sentiment, authorDisplayName, authorUsername, notes, visibility]);

  const visual = review.venueId ? getVenueVisualFallback({ id: review.venueId, cohort: review.venueCohort }) : null;

  useEffect(() => {
    if (!user) return undefined;
    return subscribeUserConversations({
      db,
      uid: user.uid,
      onChange: setConversations,
      onError: (err) => console.error('Share review inbox snapshot error:', err),
    });
  }, [user]);

  const sendToConversation = async (conversation) => {
    if (!user || !review.ratingId || sendingConversationId) return;
    setSendingConversationId(conversation.id);
    try {
      // For private/unlisted ratings, grant share access first
      if (review.visibility !== 'public') {
        const shareFn = httpsCallable(functions, 'sharePrivateRating');
        await shareFn({ ratingId: review.ratingId, conversationId: conversation.id });
      }

      if (conversation.type === 'group') {
        await sendGroupReviewLinkMessage({ db, conversation, senderUid: user.uid, review });
      } else {
        if (!conversation.otherUid) throw new Error('Direct message recipient missing');
        await sendDirectReviewLinkMessage({
          db,
          senderUid: user.uid,
          recipientUid: conversation.otherUid,
          review,
        });
      }
      router.replace({
        pathname: '/conversation/[id]',
        params: conversation.otherUid
          ? { id: conversation.id, otherUid: conversation.otherUid }
          : { id: conversation.id },
      });
    } catch (err) {
      Alert.alert('Review not sent', err.message);
    } finally {
      setSendingConversationId(null);
    }
  };

  const sentimentLabel = review.sentiment === 'loved' ? 'Loved it' : review.sentiment === 'fine' ? 'It was fine' : "Didn't like it";
  const sentimentColor = review.sentiment === 'loved' ? COLORS.success : review.sentiment === 'fine' ? COLORS.accent : COLORS.danger;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" style={styles.backButton} onPress={() => router.back()}>
          <AppIcon name="chevron-back" size={24} color={COLORS.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Send review</Text>
      </View>

      <View style={styles.reviewCard}>
        {visual && (
          <View style={[styles.reviewThumb, { backgroundColor: visual.colors[0] }]}>
            <AppIcon name={visual.iconName} size={28} color="#ffffff" />
          </View>
        )}
        <View style={styles.reviewCopy}>
          <Text style={styles.reviewVenue} numberOfLines={1}>{review.venueName}</Text>
          <Text style={[styles.reviewSentiment, { color: sentimentColor }]}>{sentimentLabel}</Text>
          <Text style={styles.reviewAuthor} numberOfLines={1}>
            {review.authorDisplayName || review.authorUsername || 'Anonymous'}
          </Text>
          {review.notes ? (
            <Text style={styles.reviewNotes} numberOfLines={2}>{review.notes}</Text>
          ) : null}
        </View>
      </View>

      <Text style={styles.sectionTitle}>Choose a chat</Text>

      {conversations.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No chats yet</Text>
          <Text style={styles.emptyBody}>Create a DM or group chat in Friends before sharing reviews.</Text>
          <Pressable style={styles.primaryButton} onPress={() => router.replace('/(tabs)/friends')}>
            <Text style={styles.primaryButtonText}>Go to Friends</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.conversationsList}>
          {conversations.map((conversation) => {
            const disabled = sendingConversationId === conversation.id;
            return (
              <Pressable
                key={conversation.id}
                style={[styles.conversationRow, disabled && styles.disabled]}
                disabled={disabled}
                onPress={() => sendToConversation(conversation)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{conversation.displayName.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.conversationCopy}>
                  <Text style={styles.conversationTitle}>{conversation.displayName}</Text>
                  <Text style={styles.conversationPreview} numberOfLines={1}>{conversation.preview}</Text>
                </View>
                <AppIcon name="paper-plane-outline" size={20} color={COLORS.accent} />
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  backButton: { padding: 4, marginRight: 8 },
  headerTitle: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '800' },
  reviewCard: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.bgCard,
  },
  reviewThumb: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewCopy: { flex: 1, minWidth: 0 },
  reviewVenue: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800' },
  reviewSentiment: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  reviewAuthor: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  reviewNotes: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4, lineHeight: 16 },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800', marginTop: 24, marginBottom: 12 },
  conversationsList: { gap: 10 },
  conversationRow: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  disabled: { opacity: 0.5 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: COLORS.accent, fontSize: 16, fontWeight: '800' },
  conversationCopy: { flex: 1, minWidth: 0 },
  conversationTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '800' },
  conversationPreview: { color: COLORS.textMuted, fontSize: 13, marginTop: 3 },
  emptyCard: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.bgCard,
  },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  emptyBody: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 8 },
  primaryButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginTop: 14,
  },
  primaryButtonText: { color: '#ffffff', fontWeight: '800' },
});
