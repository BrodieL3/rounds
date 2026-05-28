import { Link, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function VenueScreen() {
  const { id } = useLocalSearchParams();

  return (
    <View style={styles.screen}>
      <Text style={styles.eyebrow}>Venue</Text>
      <Text style={styles.title}>{id}</Text>
      <Text style={styles.copy}>Venue detail will combine static profile, time-aware signals, friend context, and booking CTAs.</Text>
      <Link href={`/venue/${id}/report-crowd`} style={styles.link}>Report crowd</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, justifyContent: 'center' },
  eyebrow: { color: '#0284c7', textTransform: 'uppercase', letterSpacing: 2, fontWeight: '700' },
  title: { fontSize: 34, fontWeight: '800', marginTop: 8 },
  copy: { fontSize: 16, marginTop: 12, color: '#475569' },
  link: { color: '#0284c7', fontWeight: '800', marginTop: 24 },
});
