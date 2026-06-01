import { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../lib/constants';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.includes('@') || password.length < 6) {
      Alert.alert('Invalid input', 'Please enter a valid email and password (6+ chars)');
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      router.replace('/(tabs)/list');
    } catch (err) {
      Alert.alert('Login failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.screen}>
      <Text style={styles.title}>Log In</Text>
      <Text style={styles.copy}>Welcome back to Rounds.</Text>

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
        placeholder="Password"
        placeholderTextColor={COLORS.textPlaceholder}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Pressable style={styles.button} onPress={submit} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Log In'}</Text>
      </Pressable>

      <Pressable onPress={() => router.push('/onboarding/phone')} style={styles.link}>
        <Text style={styles.linkText}>Don't have an account? Get Started</Text>
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
    backgroundColor: COLORS.hero,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  link: { marginTop: 20, alignItems: 'center' },
  linkText: { color: COLORS.accent, fontWeight: '700', fontSize: 14 },
});
