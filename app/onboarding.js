import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { collection, doc, getDocs, limit, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { COLORS } from '../lib/constants';
import { persistOnboarding } from '../lib/onboarding';
import { posthog } from '../src/config/posthog';

export default function OnboardingScreen() {
  const { user, reloadProfile } = useAuth();
  const [dob, setDob] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!user) {
      setError('You are not signed in.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      // All age/validation/uniqueness/write logic lives in the shared helper so
      // the screen never hand-rolls the age math and never flips into an
      // "onboarded" state on a failed write.
      const res = await persistOnboarding(
        { dob, displayName, username },
        { db, uid: user.uid, doc, collection, query, where, limit, getDocs, setDoc, serverTimestamp },
      );
      if (res.ok) {
        posthog.identify(user.uid, {
          $set: { username, display_name: displayName },
          $set_once: { onboarding_completed_date: new Date().toISOString() },
        });
        posthog.capture('onboarding_completed', { username, display_name: displayName });
        // Re-read the profile so isOnboarded flips and routing settles.
        await reloadProfile?.();
        router.replace('/(tabs)/friends');
      } else {
        setError(res.error);
      }
    } catch (e) {
      setError('Could not save your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text style={styles.title} testID="onboarding-title">Set up your profile</Text>
        <Text style={styles.subtitle}>Rounds is 18+. A few details and you're in.</Text>

        <Text style={styles.label}>Date of birth</Text>
        <TextInput
          testID="onboarding-dob-input"
          style={styles.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={COLORS.textSecondary}
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
          value={dob}
          onChangeText={setDob}
        />

        <Text style={styles.label}>Display name</Text>
        <TextInput
          testID="onboarding-displayName-input"
          style={styles.input}
          placeholder="Your name"
          placeholderTextColor={COLORS.textSecondary}
          value={displayName}
          onChangeText={setDisplayName}
        />

        <Text style={styles.label}>Username</Text>
        <TextInput
          testID="onboarding-username-input"
          style={styles.input}
          placeholder="username"
          placeholderTextColor={COLORS.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          value={username}
          onChangeText={setUsername}
          onSubmitEditing={handleSubmit}
        />

        {error ? <Text style={styles.error} testID="onboarding-error">{error}</Text> : null}

        <Pressable style={styles.button} onPress={handleSubmit} disabled={loading} testID="onboarding-submit">
          {loading
            ? <ActivityIndicator color={COLORS.bg} />
            : <Text style={styles.buttonText}>Continue</Text>
          }
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.accent,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  input: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  button: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: COLORS.bg,
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: '#C0392B',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
});
