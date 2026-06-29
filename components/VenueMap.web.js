import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../lib/constants';

// Web build: react-native-maps imports native-only RN internals and breaks the web
// bundle, so web gets a lightweight placeholder instead. Native uses VenueMap.js.
export default function VenueMap({ latitude, longitude }) {
  if (latitude == null || longitude == null) return null;
  return (
    <View style={styles.mapCard}>
      <Text style={styles.label}>Map available in the app</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mapCard: {
    height: 160,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: COLORS.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },
});
