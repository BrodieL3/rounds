import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function OnboardingScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Welcome to Rounds</Text>
      <Text style={styles.copy}>Start with music taste so the app can recommend nightlife before you rank venues.</Text>
      <Link href="/onboarding/spotify" style={styles.link}>Connect Spotify</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#0f172a' },
  title: { color: '#fff', fontSize: 34, fontWeight: '800' },
  copy: { color: '#cbd5e1', fontSize: 16, marginTop: 12 },
  link: { color: '#7dd3fc', fontWeight: '800', marginTop: 24 },
});
