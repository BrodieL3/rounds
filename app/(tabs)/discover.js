import { StyleSheet, Text, View } from 'react-native';

export default function DiscoverScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Discover</Text>
      <Text style={styles.copy}>Venue recommendations, neighborhood heatmaps, and event discovery will live here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: '800' },
  copy: { fontSize: 16, marginTop: 12, color: '#475569' },
});
