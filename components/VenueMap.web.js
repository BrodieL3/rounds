import { ImageBackground, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../lib/constants';
import { buildOsmMapUrl, buildOsmTileUrl } from '../lib/osm-static-map';

export default function VenueMap({ latitude, longitude, name }) {
  const tileUrl = buildOsmTileUrl({ latitude, longitude });
  const mapUrl = buildOsmMapUrl({ latitude, longitude });
  if (!tileUrl || !mapUrl) return null;

  const openMap = () => {
    Linking.openURL(mapUrl).catch(() => {});
  };

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Open ${name || 'venue'} on OpenStreetMap`}
      onPress={openMap}
      style={styles.mapCard}
    >
      <ImageBackground
        source={{ uri: tileUrl }}
        resizeMode="cover"
        style={styles.tile}
        imageStyle={styles.tileImage}
      >
        <View style={styles.scrim} />
        <View style={styles.pinOuter}>
          <View style={styles.pinInner} />
        </View>
        <View style={styles.attribution}>
          <Text style={styles.attributionText}>OpenStreetMap contributors</Text>
        </View>
      </ImageBackground>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  mapCard: {
    height: 160,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: COLORS.bgElevated,
    overflow: 'hidden',
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileImage: { opacity: 0.9 },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.14)',
  },
  pinOuter: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.accent,
    borderWidth: 3,
    borderColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.onAccent,
  },
  attribution: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(0,0,0,0.58)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  attributionText: { color: COLORS.textPrimary, fontSize: 11, fontWeight: '700' },
});
