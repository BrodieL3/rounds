import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import AppIcon from '../ui/AppIcon';
import { COLORS } from '../../lib/constants';

// Custom attach menu (replaces the native Alert action sheet). Tapping the attach button
// morphs the paperclip into an X and springs a column of circular icon options up from it.
// Selecting an option reports the choice to the screen, which opens the matching
// keyboard-height panel. Poll is group-only.
const OPTIONS = [
  { key: 'photo', icon: 'image', label: 'Photo' },
  { key: 'voice', icon: 'chat.mic', label: 'Voice' },
  { key: 'poll', icon: 'action.filter', label: 'Poll', groupOnly: true },
  { key: 'venue', icon: 'location', label: 'Venue' },
];

const CIRCLE = 44;
const GAP = 12;

export default function AttachmentMenu({ onSelect, isGroup = false }) {
  const [open, setOpen] = useState(false);
  const options = OPTIONS.filter((opt) => !opt.groupOnly || isGroup);

  const anims = useRef(OPTIONS.map(() => new Animated.Value(0))).current;
  const morph = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(morph, {
      toValue: open ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const springs = options.map((_, i) =>
      Animated.spring(anims[i], { toValue: open ? 1 : 0, friction: 6, tension: 90, useNativeDriver: true }),
    );
    Animated.stagger(45, open ? springs : [...springs].reverse()).start();
  }, [open, options, anims, morph]);

  const select = (key) => {
    setOpen(false);
    onSelect?.(key);
  };

  const clipStyle = {
    opacity: morph.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
    transform: [{ rotate: morph.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-45deg'] }) }],
  };
  const xStyle = {
    opacity: morph,
    transform: [{ rotate: morph.interpolate({ inputRange: [0, 1], outputRange: ['45deg', '0deg'] }) }],
  };

  return (
    <View style={styles.anchor}>
      {options.map((opt, i) => {
        const a = anims[i];
        return (
          <Animated.View
            key={opt.key}
            pointerEvents={open ? 'auto' : 'none'}
            style={[
              styles.option,
              {
                bottom: CIRCLE + GAP + i * (CIRCLE + GAP),
                opacity: a,
                transform: [
                  { scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
                  { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
                ],
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={opt.label}
              style={styles.optionCircle}
              onPress={() => select(opt.key)}
            >
              <AppIcon name={opt.icon} size={22} color={COLORS.accent} />
            </Pressable>
          </Animated.View>
        );
      })}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={open ? 'Close attachments' : 'Attach'}
        style={styles.attachButton}
        onPress={() => setOpen((v) => !v)}
      >
        <Animated.View style={[styles.iconLayer, clipStyle]}>
          <AppIcon name="attach" size={22} color={COLORS.textMuted} />
        </Animated.View>
        <Animated.View style={[styles.iconLayer, xStyle]}>
          <AppIcon name="close" size={22} color={COLORS.textPrimary} />
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: { width: CIRCLE, height: CIRCLE, alignItems: 'center', justifyContent: 'center' },
  attachButton: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgElevated,
  },
  iconLayer: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  option: { position: 'absolute', left: 0 },
  optionCircle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
