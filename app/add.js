import { useState, useMemo } from 'react';
import {
  StyleSheet, Text, View, TextInput, FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import VenueRow from '../components/VenueRow';
import { COLORS } from '../lib/constants';

const VENUE_DATA = require('../assets/venues.json');

export default function AddScreen() {
  const { profile } = useAuth();
  const [query, setQuery] = useState('');

  const cityKey = profile?.city || 'nyc';
  const cityVenues = VENUE_DATA.cities[cityKey]?.venues || [];

  const filtered = useMemo(() => {
    if (!query) return cityVenues.slice(0, 20);
    return cityVenues.filter((v) =>
      v.name.toLowerCase().includes(query.toLowerCase())
    );
  }, [cityVenues, query]);

  const renderVenue = ({ item }) => (
    <VenueRow
      item={item}
      cityKey={cityKey}
      actionMode="discovery"
      onPress={() => router.push(`/venue/${item.id}/rate`)}
    />
  );

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Rate a place</Text>
      <Text style={styles.copy}>Search the venue you just visited.</Text>

      <TextInput
        style={styles.search}
        placeholder="Search..."
        placeholderTextColor={COLORS.textPlaceholder}
        value={query}
        onChangeText={setQuery}
        autoFocus
      />

      <FlatList
        data={filtered}
        renderItem={renderVenue}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  title: {
    color: COLORS.textPrimary, fontSize: 32, fontWeight: '800',
    marginTop: 48, marginBottom: 4,
  },
  copy: { color: COLORS.textSecondary, fontSize: 16, marginBottom: 16 },
  search: {
    backgroundColor: COLORS.bgElevated, color: COLORS.textPrimary,
    fontSize: 18, padding: 16, borderRadius: 12, marginBottom: 12,
  },
  listContent: { paddingBottom: 24 },
});
