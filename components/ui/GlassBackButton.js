import { BlurView } from 'expo-blur';
import { Pressable, StyleSheet } from 'react-native';
import AppIcon from './AppIcon';
import { COLORS } from '../../lib/constants';

// iMessage-style floating "liquid glass" back button: a frosted circle with a chevron, used
// across every conversation screen so all back buttons match the Messages app.
export default function GlassBackButton({ onPress, style }) {
  return (
    <BlurView tint="dark" intensity={70} style={[styles.circle, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={onPress}
        hitSlop={12}
        style={styles.press}
      >
        <AppIcon name="chevron-back" size={24} color={COLORS.accent} />
      </Pressable>
    </BlurView>
  );
}

const SIZE = 38;

const styles = StyleSheet.create({
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  press: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
