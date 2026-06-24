import { useRef } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../lib/constants';

const {
  clampSwipeTranslate,
  resolveSwipeRest,
  shouldCaptureHorizontalSwipe,
} = require('../../lib/friends/swipe-row');

export const SWIPE_ACTION_WIDTH = 76;

// iMessage-style swipe-to-reveal row. Swiping left exposes the `rightActions` buttons; tapping
// the row opens it (or closes it if already swiped open). Pure RN Animated + PanResponder so it
// works in Expo Go with no gesture-handler / reanimated native dependency.
export default function SwipeableRow({ children, rightActions = [], onPress, registerOpen }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const lastOffset = useRef(0);
  const openWidth = rightActions.length * SWIPE_ACTION_WIDTH;

  const snapTo = (toValue) => {
    lastOffset.current = toValue;
    Animated.timing(translateX, {
      toValue,
      duration: 170,
      useNativeDriver: true,
    }).start();
  };

  const close = () => snapTo(0);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gesture) => openWidth > 0
        && shouldCaptureHorizontalSwipe(gesture.dx, gesture.dy),
      onPanResponderMove: (_evt, gesture) => {
        translateX.setValue(clampSwipeTranslate(lastOffset.current, gesture.dx, openWidth));
      },
      onPanResponderRelease: (_evt, gesture) => {
        const rest = resolveSwipeRest(lastOffset.current, gesture.dx, openWidth);
        if (rest !== 0) registerOpen?.(close);
        snapTo(rest);
      },
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

  const handlePress = () => {
    if (lastOffset.current !== 0) {
      close();
      return;
    }
    onPress?.();
  };

  return (
    <View style={styles.container}>
      {openWidth > 0 ? (
        <View style={styles.actions} pointerEvents="box-none">
          {rightActions.map((action) => (
            <Pressable
              key={action.key}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              style={[styles.actionButton, { backgroundColor: action.color, width: SWIPE_ACTION_WIDTH }]}
              onPress={() => {
                close();
                action.onPress?.();
              }}
            >
              <Text style={[styles.actionText, { color: action.textColor || '#ffffff' }]}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Animated.View
        style={[styles.foreground, { transform: [{ translateX }] }]}
        {...pan.panHandlers}
      >
        <Pressable onPress={handlePress}>{children}</Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.bg, overflow: 'hidden' },
  actions: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: { alignItems: 'center', justifyContent: 'center' },
  actionText: { fontWeight: '800', fontSize: 14 },
  foreground: { backgroundColor: COLORS.bg },
});
