import { useEffect, useRef } from 'react';
import { Animated, Easing, View, StyleSheet } from 'react-native';
import { COLORS } from '../../lib/constants';
import AppIcon from './AppIcon';

// Center "+" that morphs into a lime circle with a black X (the + rotated 45deg) while the
// Plus menu is open, and animates back to a plain + when it closes. Shared by the real tab
// bar (app/(tabs)/_layout.js) and BottomNav (root-stack detail screens) so both stay in sync.
export default function PlusMorphIcon({ open, size = 30 }) {
  const anim = useRef(new Animated.Value(open ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: open ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [open, anim]);

  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });
  const circleScale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  const iconColor = open ? COLORS.bg : COLORS.textPrimary;

  return (
    <View style={styles.wrap}>
      <Animated.View
        pointerEvents="none"
        style={[styles.circle, { opacity: anim, transform: [{ scale: circleScale }] }]}
      />
      <Animated.View style={{ transform: [{ rotate }] }}>
        <AppIcon name="tab.plus" size={size} color={iconColor} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.accent,
  },
});
