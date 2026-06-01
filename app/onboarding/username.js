import { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { COLORS } from '../../lib/constants';

export default function UsernameScreen() {
  const { data, update } = useOnboarding();
  const [username, setUsername] = useState(data.username);

  const next = () => {
    const clean = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    update({ username: clean });
    router.push('/onboarding/photo');
  };

  const skip = () => router.push('/onboarding/photo');

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.screen}>
      <Text style={styles.title}>Pick a username</Text>
      <Text style={styles.copy}>Letters, numbers, and underscores only.</Text>

      <TextInput
        style={styles.input}
        placeholder="@username"
        placeholderTextColor={COLORS.textPlaceholder}
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
        autoFocus
      />
      <Pressable style={styles.button} onPress={next}>
        <Text style={styles.buttonText}>Continue</Text>
      </Pressable>

      <Pressable onPress={skip} style={styles.skip}>
        <Text style={styles.skipText}>Skip for now</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, padding: 24, justifyContent: 'center' },
  title: { color: COLORS.textPrimary, fontSize: 32, fontWeight: '800' },
  copy: { color: COLORS.textSecondary, fontSize: 16, marginTop: 8, marginBottom: 24 },
  input: {
    backgroundColor: COLORS.bgElevated,
    color: COLORS.textPrimary,
    fontSize: 18,
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
