import { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { EmailAuthProvider, linkWithCredential, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { COLORS } from '../../lib/constants';

export default function EmailScreen() {
  const { update } = useOnboarding();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const next = async () => {
    if (!email.includes('@') || password.length < 6) {
      Alert.alert('Invalid input', 'Please enter a valid email and password (6+ chars)');
      return;
    }
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (user) {
        const credential = EmailAuthProvider.credential(email, password);
        await linkWithCredential(user, credential);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      update({ email, password });
      router.push('/onboarding/name');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const skip = () => router.push('/onboarding/name');

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.screen}>
      <Text style={styles.title}>Set your login</Text>
      <Text style={styles.copy}>Add an email and password for backup access.</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={COLORS.textPlaceholder}
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        autoFocus
      />
      <TextInput
        style={styles.input}
        placeholder="Password (6+ characters)"
        placeholderTextColor={COLORS.textPlaceholder}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Pressable style={styles.button} onPress={next} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Continue'}</Text>
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
