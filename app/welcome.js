import { StyleSheet, Text, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { COLORS } from '../lib/constants';

export default function WelcomeScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Rounds</Text>
      <Text style={styles.copy}>Discover and rank the best nightlife.</Text>

      <Pressable style={styles.button} onPress={() => router.push('/onboarding/phone')}>
        <Text style={styles.buttonText}>Get Started</Text>
      </Pressable>

      <Pressable style={styles.secondaryBtn} onPress={() => router.push('/login')}>
        <Text style={styles.secondaryText}>Log In</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, padding: 24, justifyContent: 'center', alignItems: 'center' },
  title: { color: COLORS.textPrimary, fontSize: 40, fontWeight: '900' },
  copy: { color: COLORS.textSecondary, fontSize: 16, marginTop: 8, marginBottom: 32 },
  button: {
    backgroundColor: COLORS.hero,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  secondaryBtn: {
    marginTop: 16,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  secondaryText: { color: COLORS.accent, fontWeight: '700', fontSize: 16 },
});
