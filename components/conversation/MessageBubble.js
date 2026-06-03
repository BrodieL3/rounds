import { useCallback } from 'react';
import {
  Alert,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import VoiceBubble from '../VoiceBubble';
import { COLORS, COHORT_LABELS } from '../../lib/constants';
import { ALLOWED_REACTIONS } from '../../lib/friends/reactions-service';
import { getVenueVisualFallback } from '../../lib/venue-visuals';

export default function MessageBubble({
  message,
  isMine,
  isGroup,
  sender,
  photoUrls,
  reactions,
  senderProfiles,
  user,
  conversationId,
  db,
  storage,
  onToggleReaction,
  onReply,
  onHide,
  onDeleteForEveryone,
  onReport,
  onVotePoll,
}) {
  const isVenueLink = message.type === 'venue_link';
  const isReviewLink = message.type === 'review_link';
  const isPhoto = message.type === 'photo';
  const isPoll = message.type === 'poll';
  const visual = (isVenueLink || isReviewLink)
    ? getVenueVisualFallback({
        id: message.venueId,
        name: message.venueName,
        cohort: message.venueCohort,
      })
    : null;
  const sentimentColor = isReviewLink
    ? (message.sentiment === 'loved'
        ? COLORS.success
        : message.sentiment === 'fine'
          ? COLORS.accent
          : COLORS.danger)
    : null;
  const canDelete = isMine && !message.deletedForEveryoneAt;
  const canReportFlag = !isMine && !message.deletedForEveryoneAt;

  const handleReact = useCallback(() => {
    Alert.alert('React', undefined, [
      ...ALLOWED_REACTIONS.map((emoji) => ({
        text: emoji,
        onPress: () => onToggleReaction(message, emoji),
      })),
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [message, onToggleReaction]);

  const handleReply = useCallback(() => {
    onReply(message);
  }, [message, onReply]);

  const handleHide = useCallback(() => {
    onHide(message);
  }, [message, onHide]);

  const handleDelete = useCallback(() => {
    onDeleteForEveryone(message);
  }, [message, onDeleteForEveryone]);

  const handleReport = useCallback(() => {
    onReport(message);
  }, [message, onReport]);

  const handlePressVenue = useCallback(() => {
    router.push({ pathname: '/venue/[id]', params: { id: message.venueId } });
  }, [message.venueId]);

  const handlePressReview = useCallback(() => {
    router.push({ pathname: '/post/[id]', params: { id: message.ratingId } });
  }, [message.ratingId]);

  const handleOpenMaps = useCallback(() => {
    const url = `https://www.google.com/maps/search/?api=1&query=${message.lat},${message.lng}`;
    Linking.openURL(url).catch(() => Alert.alert('Could not open maps'));
  }, [message.lat, message.lng]);

  return (
    <View style={[styles.messageRow, isMine ? styles.messageRowMine : styles.messageRowTheirs]}>
      <View style={[styles.messageStack, isMine ? styles.messageStackMine : styles.messageStackTheirs]}>
        {isGroup && !isMine && sender ? (
          <Text style={styles.senderLabel}>
            {sender.displayName || sender.username || message.senderUid}
          </Text>
        ) : null}

        {message.replyToMessageId && message.replyToPreview ? (
          <View style={[styles.replyPreview, isMine ? styles.replyPreviewMine : styles.replyPreviewTheirs]}>
            <View style={styles.replyPreviewLine} />
            <View style={styles.replyPreviewContent}>
              <Text style={styles.replyPreviewSender} numberOfLines={1}>
                {senderProfiles[message.replyToPreview.senderUid]?.displayName
                  || senderProfiles[message.replyToPreview.senderUid]?.username
                  || message.replyToPreview.senderUid}
              </Text>
              <Text style={styles.replyPreviewSnippet} numberOfLines={1}>
                {message.replyToPreview.snippet}
              </Text>
            </View>
          </View>
        ) : null}

        {message.deletedForEveryoneAt ? (
          <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
            <Text style={[styles.messageText, isMine ? styles.messageTextMine : styles.messageTextTheirs]}>
              Message deleted.
            </Text>
          </View>
        ) : isPhoto ? (
          <View style={[styles.photoBubble, isMine ? styles.photoBubbleMine : styles.photoBubbleTheirs]}>
            {(!photoUrls || photoUrls.length === 0) ? (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="image" size={24} color={COLORS.textMuted} />
              </View>
            ) : message.mediaPaths.length === 1 ? (
              <Image
                source={{ uri: photoUrls[0] }}
                style={[styles.photoImage, { aspectRatio: message.aspectRatios?.[0] || 1 }]}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.photoGrid}>
                {photoUrls.map((url, index) => (
                  <Image
                    key={message.mediaPaths[index] || index}
                    source={{ uri: url }}
                    style={[styles.photoGridItem, { aspectRatio: message.aspectRatios?.[index] || 1 }]}
                    resizeMode="cover"
                  />
                ))}
              </View>
            )}
          </View>
        ) : isPoll ? (
          <View style={[styles.pollCard, isMine ? styles.pollCardMine : styles.pollCardTheirs]}>
            <Text style={styles.pollQuestion}>{message.question}</Text>
            {(message.options || []).map((option) => (
              <Pressable
                key={option.id}
                style={styles.pollOption}
                onPress={() => onVotePoll(message, option.id)}
              >
                <Text style={styles.pollOptionText}>{option.text}</Text>
              </Pressable>
            ))}
          </View>
        ) : message.type === 'location' ? (
          <Pressable
            style={[styles.locationCard, isMine ? styles.locationCardMine : styles.locationCardTheirs]}
            onPress={handleOpenMaps}
          >
            <Ionicons name="location" size={20} color={COLORS.accent} />
            <View style={styles.locationCopy}>
              <Text style={styles.locationLabel} numberOfLines={2}>{message.label || 'Location'}</Text>
              <Text style={styles.locationCoords}>{message.lat?.toFixed(4)}, {message.lng?.toFixed(4)}</Text>
            </View>
          </Pressable>
        ) : message.type === 'voice' ? (
          <VoiceBubble
            message={message}
            isMine={isMine}
            conversationId={conversationId}
            db={db}
            storage={storage}
            user={user}
          />
        ) : isVenueLink ? (
          <Pressable
            accessibilityRole="button"
            style={[styles.venueLinkCard, isMine ? styles.venueLinkCardMine : styles.venueLinkCardTheirs]}
            onPress={handlePressVenue}
          >
            <View style={[styles.venueLinkThumb, { backgroundColor: visual.colors[0] }]}>
              <Ionicons name={visual.iconName} size={20} color="#ffffff" />
            </View>
            <View style={styles.venueLinkCopy}>
              <Text style={styles.venueLinkLabel}>Venue</Text>
              <Text style={styles.venueLinkName} numberOfLines={1}>{message.venueName}</Text>
              <Text style={styles.venueLinkMeta} numberOfLines={1}>
                {COHORT_LABELS[message.venueCohort] || message.venueCohort}
              </Text>
              {message.venueAddress ? (
                <Text style={styles.venueLinkAddress} numberOfLines={1}>{message.venueAddress}</Text>
              ) : null}
            </View>
          </Pressable>
        ) : isReviewLink ? (
          <Pressable
            accessibilityRole="button"
            style={[styles.reviewLinkCard, isMine ? styles.reviewLinkCardMine : styles.reviewLinkCardTheirs]}
            onPress={handlePressReview}
          >
            <View style={[styles.reviewLinkThumb, { backgroundColor: visual.colors[0] }]}>
              <Ionicons name={visual.iconName} size={20} color="#ffffff" />
            </View>
            <View style={styles.reviewLinkCopy}>
              <View style={styles.reviewLinkHeader}>
                <Text style={styles.reviewLinkLabel}>Review</Text>
                {message.visibility && message.visibility !== 'public' && (
                  <Text style={styles.unlistedTag}>Unlisted</Text>
                )}
              </View>
              <Text style={styles.reviewLinkVenue} numberOfLines={1}>{message.venueName}</Text>
              <Text style={[styles.reviewLinkSentiment, { color: sentimentColor }]}>
                {message.sentiment === 'loved' ? '❤️ Loved it' : message.sentiment === 'fine' ? '👍 It was fine' : "👎 Didn't like it"}
              </Text>
              <Text style={styles.reviewLinkAuthor} numberOfLines={1}>
                {message.authorDisplayName || message.authorUsername || 'Anonymous'}
              </Text>
              {message.notes ? (
                <Text style={styles.reviewLinkNotes} numberOfLines={2}>{message.notes}</Text>
              ) : null}
            </View>
          </Pressable>
        ) : (
          <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
            <Text style={[styles.messageText, isMine ? styles.messageTextMine : styles.messageTextTheirs]}>
              {message.text}
            </Text>
          </View>
        )}

        <View style={[styles.messageActions, isMine ? styles.messageActionsMine : styles.messageActionsTheirs]}>
          <Pressable onPress={handleHide}>
            <Text style={styles.messageActionText}>Hide message</Text>
          </Pressable>
          {canDelete ? (
            <Pressable onPress={handleDelete}>
              <Text style={styles.messageActionDanger}>Delete for everyone</Text>
            </Pressable>
          ) : null}
          {canReportFlag ? (
            <Pressable onPress={handleReport}>
              <Text style={styles.messageActionDanger}>Report message</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={handleReact}>
            <Text style={styles.messageActionText}>React</Text>
          </Pressable>
          <Pressable onPress={handleReply}>
            <Text style={styles.messageActionText}>Reply</Text>
          </Pressable>
        </View>

        {reactions && reactions.length > 0 ? (
          <View style={[styles.reactionsBar, isMine ? styles.reactionsBarMine : styles.reactionsBarTheirs]}>
            {reactions.map((reaction) => (
              <Pressable
                key={reaction.uid}
                style={[
                  styles.reactionPill,
                  reaction.uid === user?.uid && styles.reactionPillSelf,
                ]}
                onPress={() => {
                  if (reaction.uid === user?.uid) {
                    onToggleReaction(message, reaction.emoji);
                  }
                }}
              >
                <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  messageRow: { flexDirection: 'row' },
  messageRowMine: { justifyContent: 'flex-end' },
  messageRowTheirs: { justifyContent: 'flex-start' },
  messageStack: { maxWidth: '78%' },
  messageStackMine: { alignItems: 'flex-end' },
  messageStackTheirs: { alignItems: 'flex-start' },
  senderLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700', marginBottom: 4, marginLeft: 6 },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: { backgroundColor: COLORS.accent },
  bubbleTheirs: { backgroundColor: COLORS.bgElevated },
  messageText: { fontSize: 15, lineHeight: 20 },
  messageTextMine: { color: '#ffffff' },
  messageTextTheirs: { color: COLORS.textPrimary },
  messageActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4, paddingHorizontal: 6 },
  messageActionsMine: { justifyContent: 'flex-end' },
  messageActionsTheirs: { justifyContent: 'flex-start' },
  messageActionText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700' },
  messageActionDanger: { color: COLORS.danger, fontSize: 11, fontWeight: '800' },
  photoBubble: { maxWidth: 240, borderRadius: 18, overflow: 'hidden' },
  photoBubbleMine: { borderWidth: 1, borderColor: COLORS.accent },
  photoBubbleTheirs: { borderWidth: 1, borderColor: COLORS.bgCard },
  photoPlaceholder: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bgElevated },
  photoImage: { width: 240, borderRadius: 14 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, width: 240 },
  photoGridItem: { width: 118, borderRadius: 10 },
  pollCard: { width: 260, borderRadius: 18, padding: 14, borderWidth: 1 },
  pollCardMine: { backgroundColor: COLORS.bgElevated, borderColor: COLORS.accent },
  pollCardTheirs: { backgroundColor: COLORS.bgElevated, borderColor: COLORS.bgCard },
  pollQuestion: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '800', marginBottom: 10 },
  pollOption: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: COLORS.bg, marginBottom: 6 },
  pollOptionText: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  locationCard: { width: 240, borderRadius: 18, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1 },
  locationCardMine: { backgroundColor: COLORS.bgElevated, borderColor: COLORS.accent },
  locationCardTheirs: { backgroundColor: COLORS.bgElevated, borderColor: COLORS.bgCard },
  locationCopy: { flex: 1, minWidth: 0 },
  locationLabel: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '800' },
  locationCoords: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  venueLinkCard: { width: 260, borderRadius: 18, padding: 10, flexDirection: 'row', gap: 10, borderWidth: 1 },
  venueLinkCardMine: { backgroundColor: COLORS.bgElevated, borderColor: COLORS.accent },
  venueLinkCardTheirs: { backgroundColor: COLORS.bgElevated, borderColor: COLORS.bgCard },
  venueLinkThumb: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  venueLinkCopy: { flex: 1, minWidth: 0 },
  venueLinkLabel: { color: COLORS.accent, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  venueLinkName: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '800', marginTop: 2 },
  venueLinkMeta: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700', marginTop: 2 },
  venueLinkAddress: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  reviewLinkCard: { width: 260, borderRadius: 18, padding: 10, flexDirection: 'row', gap: 10, borderWidth: 1 },
  reviewLinkCardMine: { backgroundColor: COLORS.bgElevated, borderColor: COLORS.accent },
  reviewLinkCardTheirs: { backgroundColor: COLORS.bgElevated, borderColor: COLORS.bgCard },
  reviewLinkThumb: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  reviewLinkCopy: { flex: 1, minWidth: 0 },
  reviewLinkHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reviewLinkLabel: { color: COLORS.accent, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  unlistedTag: { color: COLORS.danger, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', backgroundColor: 'rgba(239,68,68,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  reviewLinkVenue: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '800', marginTop: 2 },
  reviewLinkSentiment: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  reviewLinkAuthor: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  reviewLinkNotes: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2, lineHeight: 14 },
  replyPreview: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, marginBottom: 4, maxWidth: '78%' },
  replyPreviewMine: { backgroundColor: 'rgba(0,0,0,0.08)' },
  replyPreviewTheirs: { backgroundColor: COLORS.bgCard },
  replyPreviewLine: { width: 3, height: 28, borderRadius: 2, backgroundColor: COLORS.accent },
  replyPreviewContent: { flex: 1, minWidth: 0 },
  replyPreviewSender: { color: COLORS.accent, fontSize: 12, fontWeight: '800' },
  replyPreviewSnippet: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  reactionsBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4, paddingHorizontal: 6 },
  reactionsBarMine: { justifyContent: 'flex-end' },
  reactionsBarTheirs: { justifyContent: 'flex-start' },
  reactionPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.bgCard },
  reactionPillSelf: { borderColor: COLORS.accent, backgroundColor: 'rgba(59,130,246,0.1)' },
  reactionEmoji: { fontSize: 16 },
});
