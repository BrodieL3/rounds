import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, COHORT_LABELS } from '../../lib/constants';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { getVenueVisualFallback } from '../../lib/venue-visuals';

const { subscribeUserConversations } = require('../../lib/friends/dm-service');
const {
  sendDirectVenueLinkMessage,
  sendGroupVenueLinkMessage,
} = require('../../lib/friends/venue-link-service');

const VENUE_DATA = require('../../assets/venues.json');

function findVenueWithCity(venueId) {
  for (const cityKey of Object.keys(VENUE_DATA.cities)) {
    const venue = VENUE_DATA.cities[cityKey].venues.find((item) => item.id === venueId);
    if (venue) return { venue: { ...venue, city: cityKey }, cityKey };
  }
  return { venue: null, cityKey: null };
}

export default function ShareVenueScreen() {
  const { venueId } = useLocalSearchParams();
  const { user } = useAuth();
  const normalizedVenueId = Array.isArray(venueId) ? venueId[0] : venueId;
  const { venue, cityKey } = useMemo(() => findVenueWithCity(normalizedVenueId), [normalizedVenueId]);
  const [conversations, setConversations] = useState([]);
  const [sendingConversationId, setSendingConversationId] = useState(null);

  useEffect(() => {
    if (!user) return undefined;
    return subscribeUserConversations({
      db,
      uid: user.uid,
      onChange: setConversations,
      onError: (err) => console.error('Share venue inbox snapshot error:', err),
    });
  }, [user]);

  const visual = venue ? getVenueVisualFallback(venue) : null;

  const sendToConversation = async (conversation) => {
    if (!user || !venue || sendingConversationId) return;
    setSendingConversationId(conversation.id);
    try {
      if (conversation.type === 'group') {
        await sendGroupVenueLinkMessage({ db, conversation, senderUid: user.uid, venue, cityKey });
      } else {
        if (!conversation.otherUid) throw new Error('Direct message recipient missing');
        await sendDirectVenueLinkMessage({
          db,
          senderUid: user.uid,
          recipientUid: conversation.otherUid,
          venue,
          cityKey,
        });
      }
      router.replace({
        pathname: '/conversation/[id]',
        params: conversation.otherUid
          ? { id: conversation.id, otherUid: conversation.otherUid }
          : { id: conversation.id },
      });
    } catch (err) {
      Alert.alert('Venue not sent', err.message);
    } finally {
      setSendingConversationId(null);
    }
  };

  if (!venue) {
    return (
      <View style={styles.screenCentered}>
        <Text style={styles.emptyTitle}>Venue not found</Text>
        <Pressable style={styles.primaryButton} onPress={() => router.back()}>
          <Text style={styles.primaryButtonText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Send venue</Text>
      </View>

      <View style={styles.venueCard}>
        <View style={[styles.venueThumb, { backgroundColor: visual.colors[0] }]}>
          <Ionicons name={visual.iconName} size={28} color="#ffffff" />
        </View>
        <View style={styles.venueCopy}>
          <Text style={styles.venueName}>{venue.name}</Text>
          <Text style={styles.venueMeta}>{COHORT_LABELS[venue.cohort] || venue.cohort}</Text>
          {venue.address ? <Text style={styles.venueAddress} numberOfLines={1}>{venue.address}</Text> : null}
        </View>
      </View>

      <Text style={styles.sectionTitle}>Choose a chat</Text>

      {conversations.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No chats yet</Text>
          <Text style={styles.emptyBody}>Create a DM or group chat in Friends before sharing venues.</Text>
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
                <Ionicons name="paper-plane-outline" size={20} color={COLORS.accent} />
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
    paddingTop: 54,
    paddingBottom: 28,
  },
  screenCentered: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  backButton: { padding: 4, marginRight: 8 },
  headerTitle: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '800' },
  venueCard: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.bgCard,
  },
  venueThumb: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  venueCopy: { flex: 1, minWidth: 0 },
  venueName: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800' },
  venueMeta: { color: COLORS.accent, fontSize: 13, fontWeight: '800', marginTop: 4 },
  venueAddress: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
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
