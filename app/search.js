import { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet, Text, View, TextInput, FlatList, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { COLORS } from '../lib/constants';
import VenueRow from '../components/VenueRow';

const { flattenCatalogVenues, searchVenues, SEARCH_MIN_LENGTH } = require('../lib/venue-catalog');
const venueSeed = require('../assets/venues.json');

// Cold-start-safe venue search (parent ISA ISC-22): filters the bundled OSM
// seed entirely client-side — no Firestore round-trip — so a brand-new user
// with zero posts can find a bar by name, area, or type and tap straight into
// its detail to log a visit. (Previously this screen searched the `users`
// collection; people-search is deferred to the social slice.)
export default function SearchScreen() {
  const corpus = useMemo(() => flattenCatalogVenues(venueSeed), []);
  const [queryText, setQueryText] = useState('');

  const results = useMemo(() => searchVenues(corpus, queryText), [corpus, queryText]);

  const openVenue = useCallback((venue) => {
    router.push(`/venue/${encodeURIComponent(venue.id)}`);
  }, []);

  const showEmpty = queryText.trim().length >= SEARCH_MIN_LENGTH && results.length === 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.screen}
    >
      <Text style={styles.title}>Find a bar</Text>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, area, or type..."
          placeholderTextColor={COLORS.textPlaceholder}
          value={queryText}
          onChangeText={setQueryText}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          returnKeyType="search"
        />
      </View>

      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={results}
        renderItem={({ item }) => (
          <VenueRow
            item={item}
            cityKey={item.cityKey}
            actionMode="discovery"
            onPress={() => openVenue(item)}
          />
        )}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          showEmpty ? (
            <Text style={styles.empty}>No bars match “{queryText.trim()}”</Text>
          ) : null
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  title: {
    color: COLORS.textPrimary, fontSize: 28, fontWeight: '800',
    marginTop: 16, marginBottom: 16,
  },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  searchInput: {
    flex: 1, backgroundColor: COLORS.bgElevated, color: COLORS.textPrimary,
    fontSize: 16, padding: 14, borderRadius: 12,
  },
  empty: { color: COLORS.textMuted, textAlign: 'center', marginTop: 24 },
});
