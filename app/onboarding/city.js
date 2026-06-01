import { useState } from 'react';
import { StyleSheet, Text, View, Pressable, FlatList } from 'react-native';
import { router } from 'expo-router';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { COLORS } from '../../lib/constants';

const CITIES = [
  { key: 'nyc', name: 'New York' },
  { key: 'boston', name: 'Boston' },
  { key: 'chicago', name: 'Chicago' },
  { key: 'sf', name: 'San Francisco' },
];

export default function CityScreen() {
  const { update } = useOnboarding();
  const [selected, setSelected] = useState('');

  const next = () => {
    update({ city: selected });
    router.push('/onboarding/preferences');
  };

  const skip = () => router.push('/onboarding/preferences');

  const renderItem = ({ item }) => (
    <Pressable
      style={[styles.cityRow, selected === item.key && styles.cityRowActive]}
      onPress={() => setSelected(item.key)}
    >
      <Text style={[styles.cityText, selected === item.key && styles.cityTextActive]}>
        {item.name}
      </Text>
    </Pressable>
  );

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Pick your city</Text>
      <Text style={styles.copy}>This sets your default venue list.</Text>

      <FlatList
        data={CITIES}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{ gap: 8 }}
      />

      <Pressable style={[styles.button, !selected && styles.buttonDisabled]} onPress={next} disabled={!selected}>
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
  cityRow: {
    backgroundColor: COLORS.bgElevated,
    padding: 16,
    borderRadius: 12,
  },
  cityRowActive: { backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.accent },
  cityText: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '600' },
  cityTextActive: { color: COLORS.accent },
  button: {
    backgroundColor: COLORS.accent,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: { backgroundColor: COLORS.bgCard },
  buttonText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
  skip: { marginTop: 16, alignItems: 'center', marginBottom: 24 },
  skipText: { color: COLORS.accent, fontWeight: '700', fontSize: 14 },
});
