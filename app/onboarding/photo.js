import { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { auth } from '../../lib/firebase';
import { pickProfileImageAsync, uploadProfilePictureAsync } from '../../lib/media-upload';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { COLORS } from '../../lib/constants';
import MediaImage from '../../components/ui/media-image';

export default function PhotoScreen() {
  const { data, update } = useOnboarding();
  const [url, setUrl] = useState(data.photoURL || '');
  const [uploading, setUploading] = useState(false);

  const pickAndUpload = async () => {
    setUploading(true);
    try {
      const picked = await pickProfileImageAsync();
      if (picked.error) {
        Alert.alert('Permission needed', 'Allow access to photos to add a profile picture.');
        return;
      }
      if (!picked.success) return;

      const user = auth.currentUser;
      if (!user) {
        setUrl(picked.uri);
        update({ photoURL: picked.uri });
        Alert.alert('Photo selected', 'Create your account before finishing so we can upload this image.');
        return;
      }

      const upload = await uploadProfilePictureAsync(user.uid, picked.uri);
      if (!upload.success) throw new Error(upload.error || 'Upload failed');

      setUrl(upload.url);
      update({ photoURL: upload.url });
    } catch (err) {
      Alert.alert('Upload failed', err.message || 'Try again when your connection is stable.');
    } finally {
      setUploading(false);
    }
  };

  const next = () => {
    update({ photoURL: url.trim() });
    router.push('/onboarding/city');
  };

  const skip = () => router.push('/onboarding/city');

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Add a photo</Text>
      <Text style={styles.copy}>Choose a square profile picture. We crop 1:1 and compress before upload.</Text>

      {url ? <MediaImage source={{ uri: url }} style={styles.preview} /> : <View style={styles.previewEmpty} />}

      <Pressable style={styles.uploadButton} onPress={pickAndUpload} disabled={uploading}>
        <Text style={styles.uploadButtonText}>{uploading ? 'Uploading...' : 'Choose photo'}</Text>
      </Pressable>

      <TextInput
        style={styles.input}
        placeholder="Or paste https://..."
        placeholderTextColor={COLORS.textPlaceholder}
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
      />

      <Pressable style={styles.button} onPress={next} disabled={uploading}>
        <Text style={styles.buttonText}>Continue</Text>
      </Pressable>

      <Pressable onPress={skip} style={styles.skip} disabled={uploading}>
        <Text style={styles.skipText}>Skip for now</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, padding: 24, justifyContent: 'center' },
  title: { color: COLORS.textPrimary, fontSize: 32, fontWeight: '800' },
  copy: { color: COLORS.textSecondary, fontSize: 16, marginTop: 8, marginBottom: 24, lineHeight: 22 },
  preview: {
    width: 132,
    height: 132,
    borderRadius: 66,
    alignSelf: 'center',
    marginBottom: 16,
    backgroundColor: COLORS.bgElevated,
  },
  previewEmpty: {
    width: 132,
    height: 132,
    borderRadius: 66,
    alignSelf: 'center',
    marginBottom: 16,
    backgroundColor: COLORS.bgElevated,
  },
  uploadButton: {
    backgroundColor: COLORS.bgElevated,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  uploadButtonText: { color: COLORS.textPrimary, fontWeight: '800', fontSize: 15 },
  input: {
    backgroundColor: COLORS.bgElevated,
    color: COLORS.textPrimary,
    fontSize: 16,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  button: {
    backgroundColor: COLORS.accent,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
  skip: { marginTop: 20, alignItems: 'center' },
  skipText: { color: COLORS.accent, fontWeight: '700', fontSize: 14 },
});
