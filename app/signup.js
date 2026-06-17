import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../lib/constants';
import { validateSignupInput, mapAuthError } from '../lib/auth-signup';

export default function SignupScreen() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    const validation = validateSignupInput(email, password);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signUp(email.trim(), password);
      // New accounts have no profile yet → collect it in onboarding.
      router.replace('/onboarding');
    } catch (e) {
      setError(mapAuthError(e));
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
        <Text style={styles.title} testID="signup-title">Create account</Text>
        <TextInput
          testID="signup-email-input"
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={COLORS.textSecondary}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          testID="signup-password-input"
          style={styles.input}
          placeholder="Password (6+ characters)"
          placeholderTextColor={COLORS.textSecondary}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={handleSignUp}
        />
        {error ? <Text style={styles.error} testID="signup-error">{error}</Text> : null}
        <Pressable style={styles.button} onPress={handleSignUp} disabled={loading} testID="signup-submit">
          {loading
            ? <ActivityIndicator color={COLORS.bg} />
            : <Text style={styles.buttonText}>Create account</Text>
          }
        </Pressable>
        <Pressable onPress={() => router.replace('/login')} testID="signup-to-login">
          <Text style={styles.link}>Already have an account? Sign in</Text>
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
    gap: 14,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.accent,
    textAlign: 'center',
    marginBottom: 16,
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
    marginTop: 4,
  },
  buttonText: {
    color: COLORS.bg,
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    color: COLORS.accent,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  error: {
    color: '#C0392B',
    fontSize: 14,
    textAlign: 'center',
  },
});
