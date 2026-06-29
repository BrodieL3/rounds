import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { COLORS } from '../lib/constants';

// Native single-pin venue map. Apple Maps is the iOS default provider (no provider
// prop, no API key). Static preview — the venue screen's address row + Directions
// button own actual navigation. The .web sibling renders a placeholder so the web
// bundle never imports react-native-maps (it pulls native-only RN internals).
export default function VenueMap({ latitude, longitude, name }) {
  if (latitude == null || longitude == null) return null;
  return (
    <View style={styles.mapCard}>
      <MapView
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude,
          longitude,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        }}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        <Marker coordinate={{ latitude, longitude }} title={name} />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  mapCard: {
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: COLORS.bgElevated,
  },
});
