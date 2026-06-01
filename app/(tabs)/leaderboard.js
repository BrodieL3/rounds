import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../lib/constants';

export default function LeaderboardScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Rank</Text>
      <View style={styles.card}>
        <Text style={styles.emoji}>🏆</Text>
        <Text style={styles.headline}>Coming Soon</Text>
        <Text style={styles.copy}>
          Venue rankings and leaderboards are being rebuilt. Check back in a future update.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, padding: 24 },
  title: {
    color: COLORS.textPrimary, fontSize: 28, fontWeight: '800',
    marginTop: 48, marginBottom: 12,
  },
  card: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginTop: 24,
  },
  emoji: { fontSize: 48, marginBottom: 16 },
  headline: {
    color: COLORS.textPrimary, fontSize: 22, fontWeight: '800',
    marginBottom: 8,
  },
  copy: {
    color: COLORS.textSecondary, fontSize: 15,
    textAlign: 'center', lineHeight: 22,
  },
});
