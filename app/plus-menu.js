import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { COLORS } from '../lib/constants';
import AppIcon from '../components/ui/AppIcon';

const { getPlusMenuActions, getPrimaryTabDescriptors } = require('../lib/navigation-shell');

const ACTIONS = getPlusMenuActions();
const TABS = getPrimaryTabDescriptors();

// Measured bottom tab bar height (paddingTop 12 + 44 icon slot + paddingBottom 18 ≈ 77pt
// on iPhone 16 Pro). The bar's explicit paddingBottom already absorbs the safe area, so we
// reserve only this — no extra inset — and the card/dim sit flush on the nav, without a gap
// and without covering the icons. See app/(tabs)/_layout.js.
const TAB_BAR_HEIGHT = 77;

function PlusAction({ action }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={action.label}
      style={({ pressed }) => [styles.actionRow, pressed && styles.actionRowPressed]}
      onPress={() => router.push(action.href)}
    >
      <View style={styles.actionTile}>
        <AppIcon name={action.iconSemantic} size={42} color={COLORS.accent} />
      </View>
      <View style={styles.actionText}>
        <Text style={styles.actionLabel}>{action.label}</Text>
        <Text style={styles.actionSubtext}>{action.subtext}</Text>
      </View>
    </Pressable>
  );
}

// The + tab just closes the menu; every other nav item closes it and lands on its page
// in one tap (router.back pops the menu, then we navigate to the tab underneath).
function handleNavPress(tab) {
  if (tab.kind === 'formSheet') {
    router.back();
    return;
  }
  router.back();
  router.navigate(tab.routeHref);
}

export default function PlusMenuScreen() {
  const navFootprint = TAB_BAR_HEIGHT;

  // The dim/card stop above the tab bar so the nav stays visible; an invisible hit row
  // sits over the real tab bar so tapping a nav item closes the menu AND navigates.
  return (
    <Pressable
      style={styles.root}
      accessibilityRole="button"
      accessibilityLabel="Close menu"
      onPress={() => router.back()}
    >
      <View pointerEvents="none" style={[styles.dim, { bottom: navFootprint }]} />
      <Pressable style={[styles.card, { bottom: navFootprint }]} onPress={() => {}}>
        {ACTIONS.map((action) => (
          <PlusAction key={action.id} action={action} />
        ))}
      </Pressable>
      <View style={[styles.navRow, { height: navFootprint }]}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.name}
            accessibilityRole="button"
            accessibilityLabel={tab.kind === 'formSheet' ? 'Close menu' : `Go to ${tab.title}`}
            style={styles.navCell}
            onPress={() => handleNavPress(tab)}
          />
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  dim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  card: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 28,
    gap: 40,
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionRowPressed: {
    opacity: 0.6,
  },
  actionTile: {
    width: 76,
    height: 76,
    borderRadius: 16,
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 18,
  },
  actionText: {
    flex: 1,
    justifyContent: 'center',
  },
  actionLabel: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '500',
    lineHeight: 26,
  },
  actionSubtext: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
  navRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  navCell: {
    flex: 1,
  },
});
