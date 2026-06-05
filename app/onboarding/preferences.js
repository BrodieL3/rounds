import { useState } from 'react';
import { StyleSheet, Text, View, Pressable, FlatList } from 'react-native';
import { router } from 'expo-router';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { COLORS } from '../../lib/constants';

const COHORTS = [
  { key: 'cocktail_bar', label: 'Cocktail Lounges' },
  { key: 'wine_bar', label: 'Wine Bars' },
  { key: 'sports_bar', label: 'Sports Bars' },
  { key: 'pub', label: 'Pubs' },
  { key: 'night_club', label: 'Nightclubs' },
  { key: 'dive_bar', label: 'Dive Bars' },
];

export default function PreferencesScreen() {
  const { data, update } = useOnboarding();
  const [selected, setSelected] = useState(new Set(data.cohortPreferences || []));

  const toggle = (key) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  };

  const next = () => {
    update({ cohortPreferences: Array.from(selected) });
    router.push('/onboarding/spotify');
  };

  const skip = () => router.push('/onboarding/spotify');

  const renderItem = ({ item }) => {
    const active = selected.has(item.key);
    return (
      <Pressable
        style={[styles.row, active && styles.rowActive]}
        onPress={() => toggle(item.key)}
      >
        <Text style={[styles.rowText, active && styles.rowTextActive]}>
          {active ? '✓ ' : '○ '}{item.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>What do you like?</Text>
      <Text style={styles.copy}>Select all that apply. Tap to toggle.</Text>

      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={COHORTS}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{ gap: 8 }}
      />

      <Pressable style={styles.button} onPress={next}>
        <Text style={styles.buttonText}>Continue</Text>
      </Pressable>

      <Pressable onPress={skip} style={styles.skip}>
        <Text style={styles.skipText}>Skip for now</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, padding: 24 },
  title: { color: COLORS.textPrimary, fontSize: 32, fontWeight: '800', marginTop: 40 },
  copy: { color: COLORS.textSecondary, fontSize: 16, marginTop: 8, marginBottom: 24 },
  row: {
    backgroundColor: COLORS.bgElevated,
    padding: 16,
    borderRadius: 12,
  },
  rowActive: { backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.accent },
  rowText: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '600' },
  rowTextActive: { color: COLORS.accent },
  button: {
    backgroundColor: COLORS.accent,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
  skip: { marginTop: 16, alignItems: 'center', marginBottom: 24 },
  skipText: { color: COLORS.accent, fontWeight: '700', fontSize: 14 },
});
