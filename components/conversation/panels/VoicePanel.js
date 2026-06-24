import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import AppIcon from '../../ui/AppIcon';
import { COLORS } from '../../../lib/constants';
import { formatVoiceDuration } from '../../../lib/friends/conversation-surface';

const MAX_MS = 60000;
const RING = 200;

// Single press-and-hold mic. A red circle slowly fills out from behind the icon while held
// (reaching full at the 60s cap that the recorder auto-stops at), and the note sends on release.
export default function VoicePanel({ recording, elapsedMs = 0, onStartRecord, onStopRecord }) {
  const fill = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (recording) {
      Animated.timing(fill, { toValue: 1, duration: MAX_MS, useNativeDriver: true }).start();
    } else {
      fill.stopAnimation();
      Animated.timing(fill, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [recording, fill]);

  const scale = fill.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] });

  return (
    <View style={styles.panel}>
      <Text style={styles.hint}>
        {recording ? formatVoiceDuration(elapsedMs) : 'Hold to record'}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Hold to record voice message"
        onPressIn={onStartRecord}
        onPressOut={onStopRecord}
        style={styles.button}
      >
        <Animated.View
          pointerEvents="none"
          style={[styles.fill, { opacity: fill, transform: [{ scale }] }]}
        />
        <AppIcon name="chat.mic" size={44} color={recording ? COLORS.onAccent : COLORS.textPrimary} />
      </Pressable>
      <Text style={styles.caption}>
        {recording ? 'Release to send' : 'Press and hold the mic'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 },
  hint: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '700', minHeight: 20 },
  button: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgElevated,
  },
  fill: {
    position: 'absolute',
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    backgroundColor: COLORS.danger,
  },
  caption: { color: COLORS.textMuted, fontSize: 13 },
});
