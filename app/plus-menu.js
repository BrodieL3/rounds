import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { COLORS } from '../lib/constants';
import AppIcon from '../components/ui/AppIcon';

const { getPlusMenuActions } = require('../lib/navigation-shell');

const ACTIONS = getPlusMenuActions();

function PlusAction({ action }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={action.label}
      style={styles.actionRow}
      onPress={() => router.push(action.href)}
    >
      <View style={styles.actionTile}>
        <AppIcon name={action.iconSemantic} size={42} color={COLORS.bg} />
      </View>
      <View style={styles.actionText}>
        <Text style={styles.actionLabel}>{action.label}</Text>
        <Text style={styles.actionSubtext}>{action.subtext}</Text>
      </View>
    </Pressable>
  );
}

export default function PlusMenuScreen() {
  return (
    <View style={styles.container}>
      {ACTIONS.map((action) => (
        <PlusAction key={action.id} action={action} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 22,
    paddingVertical: 24,
    gap: 40,
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionTile: {
    width: 76,
    height: 76,
    borderRadius: 16,
    backgroundColor: '#084EB8',
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
});
