import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function ReportCrowdScreen() {
  const { id } = useLocalSearchParams();

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Report crowd</Text>
      <Text style={styles.copy}>Venue: {id}</Text>
      <Text style={styles.copy}>Later: request location, verify geofence, submit queue length, cover, and density.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: '800' },
  copy: { fontSize: 16, marginTop: 12, color: '#475569' },
});
