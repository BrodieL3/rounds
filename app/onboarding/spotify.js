import { StyleSheet, Text, View } from 'react-native';

export default function SpotifyOnboardingScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Spotify connection</Text>
      <Text style={styles.copy}>Prototype placeholder: OAuth launch belongs in Expo; token exchange and acoustic profile processing belong on the backend.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: '800' },
  copy: { fontSize: 16, marginTop: 12, color: '#475569' },
});
