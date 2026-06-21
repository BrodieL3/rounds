import { useState, useCallback, useEffect } from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AppIcon from '../../../components/ui/AppIcon';
import {
  collection, query, where, getDocs, onSnapshot, doc, getDoc,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { pickReviewImagesAsync } from '../../../lib/media-upload';
import { createRatingWithProjectionAsync } from '../../../lib/ratings/rating-service';
import { buildLogConfirmation } from '../../../lib/log-visit';
import { useAuth } from '../../../contexts/AuthContext';
import { COLORS, COHORT_LABELS } from '../../../lib/constants';
import { getVenueVisualFallback } from '../../../lib/venue-visuals';
import MediaImage from '../../../components/ui/media-image';
import { usePostHog } from 'posthog-react-native';

const VENUE_DATA = require('../../../assets/venues.json');

function findVenue(id) {
  for (const cityKey of Object.keys(VENUE_DATA.cities)) {
    const v = VENUE_DATA.cities[cityKey].venues.find((x) => x.id === id);
    if (v) return v;
  }
  return null;
}

export default function RateScreen() {
  const { id } = useLocalSearchParams();
  const { user, profile } = useAuth();
  const posthog = usePostHog();
  const venue = findVenue(id);
  const visual = venue ? getVenueVisualFallback(venue) : null;

  const [sentiment, setSentiment] = useState(null);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState([]);
  const [companions, setCompanions] = useState([]);
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'friendships'), where('memberUids', 'array-contains', user.uid));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const friendUids = snapshot.docs.map((doc) => {
        const data = doc.data();
        return data.memberUids.find((uid) => uid !== user.uid);
      }).filter(Boolean);

      const friendProfiles = await Promise.all(
        friendUids.map(async (uid) => {
          const userSnap = await getDoc(doc(db, 'users', uid));
          const userData = userSnap.exists() ? userSnap.data() : {};
          return { uid, ...userData };
        })
      );

      setFriends(friendProfiles.sort((a, b) =>
        (a.displayName || a.username || a.uid).localeCompare(b.displayName || b.username || b.uid)
      ));
      setFriendsLoading(false);
    }, (err) => {
      console.error('Friends load error:', err);
      setFriendsLoading(false);
    });

    return unsubscribe;
  }, [user]);

  if (!venue) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Venue not found</Text>
      </View>
    );
  }

  const pickImages = async () => {
    Keyboard.dismiss();
    const result = await pickReviewImagesAsync();
    Keyboard.dismiss();
    if (result.error) {
      Alert.alert('Permission needed', 'Allow access to photos to add them to your review.');
      return;
    }
    if (result.success) {
      setPhotos((prev) => [...prev, ...result.uris]);
    }
  };

  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleCompanion = (uid) => {
    setCompanions((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const submit = useCallback(async () => {
    if (!sentiment) {
      Alert.alert('Pick a rating', 'How was it?');
      return;
    }
    setSubmitting(true);
    try {
      if (!user) throw new Error('Sign in before posting a review.');

      const result = await createRatingWithProjectionAsync({
        user,
        profile,
        venue,
        sentiment,
        notes,
        localPhotoUris: photos,
        companionUids: companions.length > 0 ? companions : undefined,
        visibility: 'public',
      });
      if (!result.success) throw new Error(result.error || 'Rating failed');

      posthog.capture('visit_logged', {
        venue_id: venue.id,
        venue_name: venue.name,
        cohort: venue.cohort,
        sentiment,
        has_notes: notes.trim().length > 0,
        photo_count: photos.length,
        companion_count: companions.length,
      });

      // The hero "it saved" signal: every successful log gets a clear confirmation
      // before we leave the screen (F3 slice 1, parent ISA ISC-16).
      const confirmation = buildLogConfirmation(sentiment, venue.name);

      const ratingsQ = query(
        collection(db, 'ratings'),
        where('userId', '==', user.uid),
        where('cohort', '==', venue.cohort)
      );
      const ratingsSnap = await getDocs(ratingsQ);
      const count = ratingsSnap.size;

      // At 2+ ratings in a cohort, offer the comparison flow as a secondary action;
      // otherwise just acknowledge the save. Either way the user is told it saved.
      const buttons = count >= 2
        ? [
          { text: 'Done', style: 'cancel', onPress: () => router.back() },
          { text: 'Compare', onPress: () => router.push('/compare') },
        ]
        : [{ text: 'Done', onPress: () => router.back() }];

      Alert.alert(confirmation.title, confirmation.message, buttons);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  }, [sentiment, notes, photos, user, profile, venue]);

  const sentimentButton = (key, label) => {
    const active = sentiment === key;
    const colors = { loved: COLORS.success, fine: COLORS.accent, disliked: COLORS.danger };
    return (
      <Pressable
        style={[styles.sentimentBtn, active && { borderColor: colors[key], borderWidth: 2 }]}
        onPress={() => setSentiment(key)}
      >
        <Text style={[styles.sentimentText, active && { color: colors[key] }]}>
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 84 : 0}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.screen}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
      {/* Venue thumbnail */}
      {visual && (
        <View style={[styles.venueThumb, { backgroundColor: visual.colors[0] }]}>
          <AppIcon name={visual.iconName} size={32} color="#ffffff" />
        </View>
      )}

      <Text style={styles.title}>{venue.name}</Text>
      <Text style={styles.meta}>{COHORT_LABELS[venue.cohort] || venue.cohort}</Text>

      <Text style={styles.sectionTitle}>How was it?</Text>
      <View style={styles.sentimentRow}>
        {sentimentButton('loved', 'Loved it')}
        {sentimentButton('fine', 'It was fine')}
        {sentimentButton('disliked', "Didn't like it")}
      </View>

      <Text style={styles.sectionTitle}>Photos</Text>
      {photos.length > 0 && (
        <FlatList
          contentInsetAdjustmentBehavior="automatic"
          data={photos}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, marginBottom: 12 }}
          renderItem={({ item, index }) => (
            <View style={styles.photoWrap}>
              <MediaImage source={{ uri: item }} style={styles.photoThumb} />
              <Pressable style={styles.photoRemove} onPress={() => removePhoto(index)}>
                <Text style={styles.photoRemoveText}>×</Text>
              </Pressable>
            </View>
          )}
          keyExtractor={(_, i) => i.toString()}
        />
      )}
      <Pressable style={styles.photoBtn} onPress={pickImages}>
        <Text style={styles.photoBtnText}>+ Add photos</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Who went with you?</Text>
      {friendsLoading ? (
        <Text style={styles.emptyText}>Loading friends...</Text>
      ) : friends.length === 0 ? (
        <Text style={styles.emptyText}>Add friends to tag companions</Text>
      ) : (
        <View style={styles.companionsWrap}>
          {friends.map((friend) => {
            const selected = companions.includes(friend.uid);
            return (
              <Pressable
                key={friend.uid}
                style={[styles.companionChip, selected && styles.companionChipActive]}
                onPress={() => toggleCompanion(friend.uid)}
              >
                <Text style={[styles.companionChipText, selected && styles.companionChipTextActive]}>
                  {friend.displayName || friend.username || friend.uid}
                </Text>
                {selected && <AppIcon name="checkmark" size={14} color="#ffffff" style={{ marginLeft: 4 }} />}
              </Pressable>
            );
          })}
        </View>
      )}

      <Text style={styles.sectionTitle}>Notes (optional)</Text>
      <TextInput
        style={styles.textarea}
        placeholder="What stood out?"
        placeholderTextColor={COLORS.textPlaceholder}
        multiline
        numberOfLines={4}
        value={notes}
        onChangeText={setNotes}
      />

      {/* Review preview */}
      {sentiment && (
        <View style={styles.previewCard}>
          <Text style={styles.sectionTitle}>Preview</Text>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Venue</Text>
            <Text style={styles.previewValue}>{venue.name}</Text>
          </View>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Sentiment</Text>
            <Text style={styles.previewValue}>
              {sentiment === 'loved' ? 'Loved it' : sentiment === 'fine' ? 'It was fine' : "Didn't like it"}
            </Text>
          </View>
          {notes.trim() ? (
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Notes</Text>
              <Text style={styles.previewValue} numberOfLines={2}>{notes.trim()}</Text>
            </View>
          ) : null}
          {photos.length > 0 ? (
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Photos</Text>
              <Text style={styles.previewValue}>{photos.length} selected</Text>
            </View>
          ) : null}
        </View>
      )}

      <Pressable
        style={[styles.submitBtn, !sentiment && styles.submitBtnDisabled]}
        onPress={submit}
        disabled={!sentiment || submitting}
      >
        <Text style={styles.submitText}>{submitting ? 'Saving...' : 'Submit'}</Text>
      </Pressable>

      <Pressable onPress={() => router.back()} style={styles.cancel}>
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.bg },
  screen: { flexGrow: 1, backgroundColor: COLORS.bg, padding: 24, paddingBottom: 48 },
  title: { color: COLORS.textPrimary, fontSize: 28, fontWeight: '800' },
  meta: { color: COLORS.textMuted, fontSize: 14, marginTop: 4 },
  sectionTitle: {
    color: COLORS.textSecondary, fontSize: 16, fontWeight: '700',
    marginTop: 24, marginBottom: 12,
  },
  sentimentRow: { flexDirection: 'row', gap: 10 },
  sentimentBtn: {
    flex: 1, backgroundColor: COLORS.bgElevated,
    padding: 16, borderRadius: 12, alignItems: 'center',
  },
  sentimentText: { color: COLORS.textPrimary, fontWeight: '700', fontSize: 14 },
  photoWrap: { position: 'relative' },
  photoThumb: { width: 80, height: 80, borderRadius: 8 },
  photoRemove: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: COLORS.danger, width: 20, height: 20,
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  photoRemoveText: { color: '#fff', fontSize: 14, fontWeight: '700', lineHeight: 18 },
  photoBtn: {
    backgroundColor: COLORS.bgCard, padding: 12,
    borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.textMuted,
    borderStyle: 'dashed',
  },
  photoBtnText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 14 },
  textarea: {
    backgroundColor: COLORS.bgElevated, color: COLORS.textPrimary,
    fontSize: 16, padding: 16, borderRadius: 12, minHeight: 100,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: COLORS.hero, padding: 16,
    borderRadius: 12, alignItems: 'center', marginTop: 24,
  },
  submitBtnDisabled: { backgroundColor: COLORS.bgCard },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  cancel: { marginTop: 16, alignItems: 'center' },
  cancelText: { color: COLORS.textMuted, fontSize: 14 },
  venueThumb: {
    width: 80,
    height: 80,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  companionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  companionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgElevated,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.bgCard,
  },
  companionChipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  companionChipText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  companionChipTextActive: {
    color: '#ffffff',
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginBottom: 8,
  },
  previewCard: {
    backgroundColor: COLORS.bgElevated,
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  previewRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  previewLabel: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
    width: 80,
  },
  previewValue: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
});
