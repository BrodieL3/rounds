import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function ProfileScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.copy}>Taste profile, acoustic vector status, VibeCoins, and settings will live here.</Text>
      <Link href="/onboarding" style={styles.link}>Open onboarding</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: '800' },
  copy: { fontSize: 16, marginTop: 12, color: '#475569' },
  link: { color: '#0284c7', fontWeight: '700', marginTop: 20 },
});
