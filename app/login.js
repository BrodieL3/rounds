import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../lib/constants';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    if (!email || !password) return;
    setError('');
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace('/(tabs)/friends');
    } catch (e) {
      setError('Invalid email or password.');
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
        <Text style={styles.title} testID="login-title">Rounds</Text>
        <TextInput
          testID="login-email-input"
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={COLORS.textSecondary}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          testID="login-password-input"
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={COLORS.textSecondary}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={handleSignIn}
        />
        {error ? <Text style={styles.error} testID="login-error">{error}</Text> : null}
        <Pressable style={styles.button} onPress={handleSignIn} disabled={loading} testID="login-submit">
          {loading
            ? <ActivityIndicator color={COLORS.bg} />
            : <Text style={styles.buttonText}>Sign in</Text>
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
  error: {
    color: '#C0392B',
    fontSize: 14,
    textAlign: 'center',
  },
});
