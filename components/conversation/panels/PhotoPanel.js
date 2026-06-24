import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import AppIcon from '../../ui/AppIcon';
import MediaImage from '../../ui/media-image';
import { COLORS } from '../../../lib/constants';

const COLS = 4;
const GAP = 3;
const SIZE = Math.floor((Dimensions.get('window').width - GAP * (COLS + 1)) / COLS);
const MAX_SELECT = 10;

// In-panel camera-roll grid (replaces the native picker). Multi-select recent photos plus a
// leading Camera tile; sends already-resolved { uri, aspectRatio } photos through the hook.
export default function PhotoPanel({ onSendPhotos, sending }) {
  const [granted, setGranted] = useState(null);
  const [assets, setAssets] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!mounted) return;
      setGranted(perm.granted);
      if (perm.granted) {
        try {
          const page = await MediaLibrary.getAssetsAsync({
            first: 60,
            sortBy: [MediaLibrary.SortBy.creationTime],
            mediaType: MediaLibrary.MediaType.photo,
          });
          if (mounted) setAssets(page.assets);
        } catch (err) {
          console.error('Photo panel asset load error:', err);
        }
      }
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const toggle = (id) => {
    setSelected((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= MAX_SELECT) return cur;
      return [...cur, id];
    });
  };

  const send = async () => {
    if (selected.length === 0 || sending) return;
    const chosen = selected.map((id) => assets.find((a) => a.id === id)).filter(Boolean);
    // ph:// asset URIs can't upload directly — resolve a usable localUri first (and pull
    // down from iCloud if the photo isn't on-device).
    const infos = await Promise.all(
      chosen.map((a) => MediaLibrary.getAssetInfoAsync(a, { shouldDownloadFromNetwork: true })),
    );
    const photos = infos.map((info, i) => ({
      uri: info.localUri || info.uri || chosen[i].uri,
      aspectRatio: chosen[i].width && chosen[i].height ? chosen[i].width / chosen[i].height : 1,
    }));
    onSendPhotos(photos);
    setSelected([]);
  };

  const openCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.55 });
    if (result.canceled || !result.assets?.length) return;
    const a = result.assets[0];
    onSendPhotos([{ uri: a.uri, aspectRatio: a.width && a.height ? a.width / a.height : 1 }]);
  };

  if (granted === false) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>Allow photo access to pick pictures.</Text>
        <Pressable style={styles.permButton} onPress={() => Linking.openSettings?.()}>
          <Text style={styles.permButtonText}>Open Settings</Text>
        </Pressable>
      </View>
    );
  }

  const data = [{ id: '__camera__', camera: true }, ...assets];

  const renderItem = ({ item }) => {
    if (item.camera) {
      return (
        <Pressable accessibilityLabel="Camera" style={[styles.cell, styles.cameraCell]} onPress={openCamera}>
          <AppIcon name="chat.camera" size={26} color={COLORS.accent} />
        </Pressable>
      );
    }
    const order = selected.indexOf(item.id);
    const isSel = order >= 0;
    return (
      <Pressable style={styles.cell} onPress={() => toggle(item.id)}>
        <MediaImage source={{ uri: item.uri }} style={styles.image} contentFit="cover" />
        {isSel ? (
          <View style={styles.selOverlay}>
            <View style={styles.selBadge}><Text style={styles.selBadgeText}>{order + 1}</Text></View>
          </View>
        ) : null}
      </Pressable>
    );
  };

  return (
    <View style={styles.panel}>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={COLORS.accent} /></View>
      ) : (
        <FlatList
          style={styles.flex}
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={COLS}
          contentContainerStyle={styles.grid}
        />
      )}
      <Pressable
        accessibilityRole="button"
        style={[styles.sendBar, (selected.length === 0 || sending) && styles.disabled]}
        onPress={send}
        disabled={selected.length === 0 || sending}
      >
        <Text style={styles.sendText}>
          {selected.length > 0 ? `Send (${selected.length})` : 'Select photos'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  grid: { padding: GAP },
  cell: { width: SIZE, height: SIZE, margin: GAP / 2 },
  cameraCell: { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bgElevated, borderRadius: 4 },
  image: { width: '100%', height: '100%', borderRadius: 4, backgroundColor: COLORS.bgElevated },
  selOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 4,
    borderWidth: 3,
    borderColor: COLORS.accent,
    alignItems: 'flex-end',
  },
  selBadge: {
    margin: 4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selBadgeText: { color: COLORS.onAccent, fontSize: 12, fontWeight: '800' },
  sendBar: { backgroundColor: COLORS.accent, paddingVertical: 14, alignItems: 'center', margin: 12, borderRadius: 16 },
  disabled: { opacity: 0.5 },
  sendText: { color: COLORS.onAccent, fontWeight: '800', fontSize: 15 },
  permText: { color: COLORS.textSecondary, fontSize: 15, textAlign: 'center' },
  permButton: { backgroundColor: COLORS.accent, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 10 },
  permButtonText: { color: COLORS.onAccent, fontWeight: '800' },
});
