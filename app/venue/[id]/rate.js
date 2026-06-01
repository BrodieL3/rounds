import { useState, useCallback } from 'react';
import {
  Alert,
  FlatList,
  Image,
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
import {
  collection, addDoc, query, where, getDocs, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { createReviewWithMediaAsync, pickReviewImagesAsync } from '../../../lib/media-upload';
import { useAuth } from '../../../contexts/AuthContext';
import { COLORS, COHORT_LABELS } from '../../../lib/constants';

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
  const venue = findVenue(id);

  const [sentiment, setSentiment] = useState(null);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]);
  const [submitting, setSubmitting] = useState(false);

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

  const submit = useCallback(async () => {
    if (!sentiment) {
      Alert.alert('Pick a rating', 'How was it?');
      return;
    }
    setSubmitting(true);
    try {
      if (!user) throw new Error('Sign in before posting a review.');

      const baseReviewData = {
        userId: user.uid,
        username: profile?.username || 'user',
        displayName: profile?.displayName || 'User',
        venueId: venue.id,
        venueName: venue.name,
        cohort: venue.cohort,
        sentiment,
        description: description.trim(),
        likes: 0,
        likedBy: [],
        city: profile?.city || 'nyc',
      };

      const reviewUpload = await createReviewWithMediaAsync(baseReviewData, photos);
      if (!reviewUpload.success) throw new Error(reviewUpload.error || 'Photo upload failed');
      const mediaUrls = reviewUpload.urls;

      const ratingData = {
        ...baseReviewData,
        reviewId: reviewUpload.reviewId,
        mediaUrls,
        photoURLs: mediaUrls,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'ratings'), ratingData);

      const postData = {
        ...baseReviewData,
        reviewId: reviewUpload.reviewId,
        mediaUrls,
        photoURLs: mediaUrls,
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'posts'), postData);

      const ratingsQ = query(
        collection(db, 'ratings'),
        where('userId', '==', user.uid),
        where('cohort', '==', venue.cohort)
      );
      const ratingsSnap = await getDocs(ratingsQ);
      const count = ratingsSnap.size;

      if (count >= 2) {
        Alert.alert(
          'Rank it!',
          `You've rated ${count} ${COHORT_LABELS[venue.cohort] || venue.cohort}. Time to compare!`,
          [
            { text: 'Later', onPress: () => router.back() },
            { text: 'Compare', onPress: () => router.push('/compare') },
          ]
        );
      } else {
        router.back();
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  }, [sentiment, description, photos, user, profile, venue]);

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
        contentContainerStyle={styles.screen}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
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
          data={photos}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, marginBottom: 12 }}
          renderItem={({ item, index }) => (
            <View style={styles.photoWrap}>
              <Image source={{ uri: item }} style={styles.photoThumb} />
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

      <Text style={styles.sectionTitle}>Notes (optional)</Text>
      <TextInput
        style={styles.textarea}
        placeholder="What stood out?"
        placeholderTextColor={COLORS.textPlaceholder}
        multiline
        numberOfLines={4}
        value={description}
        onChangeText={setDescription}
      />

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
  title: { color: COLORS.textPrimary, fontSize: 28, fontWeight: '800', marginTop: 48 },
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
});
