import { StyleSheet, Text, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { COLORS } from '../../lib/constants';

export default function PhoneScreen() {
  const { update } = useOnboarding();

  const skip = () => {
    update({ phone: null });
    router.push('/onboarding/email');
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Phone auth</Text>
      <Text style={styles.copy}>
        SMS verification requires a native development build.
        For now, continue with email sign-in.
      </Text>

      <Pressable style={styles.button} onPress={skip}>
        <Text style={styles.buttonText}>Continue with email</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, padding: 24, justifyContent: 'center' },
  title: { color: COLORS.textPrimary, fontSize: 32, fontWeight: '800' },
  copy: { color: COLORS.textSecondary, fontSize: 16, marginTop: 8, marginBottom: 24, lineHeight: 22 },
  button: {
    backgroundColor: COLORS.accent, padding: 16,
    borderRadius: 12, alignItems: 'center',
  },
  buttonText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
});
