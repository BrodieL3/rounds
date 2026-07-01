import { useState, useMemo, useCallback } from 'react';
import {
  Alert, StyleSheet, Text, TextInput, FlatList, Pressable, View,
} from 'react-native';
import { router } from 'expo-router';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import VenueRow from '../components/VenueRow';
import { COLORS, DEFAULT_METRO, getMetroCities } from '../lib/constants';
import ScreenContainer from '../components/ui/ScreenContainer';
import { buildStopPayload } from '../lib/stops';
import AppIcon from '../components/ui/AppIcon';

const VENUE_DATA = require('../assets/venues.json');
const { sortVenuesByDistance, formatDistance } = require('../lib/geo');

// expo-location is an optional dependency (ISC-53). Feature-detect so the
// browse list still renders if it's not installed yet.
let Location = null;
try { Location = require('expo-location'); } catch (e) { Location = null; }

export default function AddScreen() {
  const { user, profile } = useAuth();
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState('default');
  const [origin, setOrigin] = useState(null);
  const [locationStatus, setLocationStatus] = useState('idle');
  const [stoppingId, setStoppingId] = useState(null);
  const [stoppedIds, setStoppedIds] = useState({});

  // Browse the whole metro lens (Boston + Cambridge), not a phantom user city
  // (ADR 007). Each venue keeps its own .city for routing + precise labels.
  const metro = profile?.metro || DEFAULT_METRO;
  const cityVenues = getMetroCities(metro)
    .flatMap((c) => VENUE_DATA.cities[c]?.venues || []);

  const filtered = useMemo(() => {
    if (!query) return cityVenues.slice(0, 20);
    return cityVenues.filter((v) =>
      v.name.toLowerCase().includes(query.toLowerCase())
    );
  }, [cityVenues, query]);

  const displayed = useMemo(() => {
    if (sortMode === 'nearest') return sortVenuesByDistance(filtered, origin);
    return filtered;
  }, [filtered, sortMode, origin]);

  const logStop = useCallback(async (venue) => {
    if (!user) {
      Alert.alert('Sign in required', 'Sign in before logging a stop.');
      return;
    }
    if (stoppingId) return;

    setStoppingId(venue.id);
    try {
      const payload = buildStopPayload({ userId: user.uid, venue, createdAt: serverTimestamp() });
      await addDoc(collection(db, 'stops'), payload);
      setStoppedIds((prev) => ({ ...prev, [venue.id]: true }));
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setStoppingId(null);
    }
  }, [user, stoppingId]);

  const handleSortPress = async (mode) => {
    if (mode === 'default') {
      setSortMode('default');
      return;
    }

    setSortMode('nearest');

    if (origin) return;

    if (!Location?.requestForegroundPermissionsAsync || !Location?.getCurrentPositionAsync) {
      setLocationStatus('unavailable');
      return;
    }

    setLocationStatus('requesting');

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      const granted = permission?.granted || permission?.status === 'granted';

      if (!granted) {
        setLocationStatus('denied');
        return;
      }

      const position = await Location.getCurrentPositionAsync({});
      const coords = position?.coords;

      if (
        typeof coords?.latitude !== 'number'
        || typeof coords?.longitude !== 'number'
        || !Number.isFinite(coords.latitude)
        || !Number.isFinite(coords.longitude)
      ) {
        setLocationStatus('unavailable');
        return;
      }

      setOrigin({ latitude: coords.latitude, longitude: coords.longitude });
      setLocationStatus('granted');
    } catch (e) {
      setLocationStatus('unavailable');
    }
  };

  const renderVenue = ({ item }) => {
    const distance = sortMode === 'nearest' ? formatDistance(item.distanceMeters) : '';
    const rowWithStop = (
      <View style={styles.venueActionRow}>
        <View style={styles.venueRowWrap}>
          <VenueRow
            item={item}
            cityKey={item.city}
            actionMode="discovery"
            onPress={() => router.push(`/venue/${encodeURIComponent(item.id)}/rate`)}
          />
        </View>
        <Pressable
          style={[styles.stopPill, stoppedIds[item.id] && styles.stopPillSaved]}
          onPress={() => logStop(item)}
          disabled={stoppingId === item.id}
          hitSlop={8}
          accessibilityLabel={`Log that you were at ${item.name}`}
        >
          <AppIcon
            name={stoppedIds[item.id] ? 'checkmark' : 'location'}
            size={14}
            color={stoppedIds[item.id] ? COLORS.onAccent : COLORS.accent}
          />
          <Text style={[styles.stopPillText, stoppedIds[item.id] && styles.stopPillTextSaved]}>
            {stoppedIds[item.id] ? 'Saved' : 'I was here'}
          </Text>
        </Pressable>
      </View>
    );

    if (!distance) return rowWithStop;

    return (
      <View style={styles.venueWithDistance}>
        {rowWithStop}
        <Text style={styles.distance}>{distance}</Text>
      </View>
    );
  };

  return (
    <ScreenContainer style={styles.screen}>
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

      <View style={styles.sortToggle}>
        <Pressable
          style={[
            styles.sortSegment,
            sortMode === 'default' && styles.sortSegmentSelected,
          ]}
          onPress={() => handleSortPress('default')}
        >
          <Text
            style={[
              styles.sortText,
              sortMode === 'default' && styles.sortTextSelected,
            ]}
          >
            Default
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.sortSegment,
            sortMode === 'nearest' && styles.sortSegmentSelected,
          ]}
          onPress={() => handleSortPress('nearest')}
          disabled={locationStatus === 'requesting'}
        >
          <Text
            style={[
              styles.sortText,
              sortMode === 'nearest' && styles.sortTextSelected,
            ]}
          >
            {locationStatus === 'requesting' ? 'Nearest…' : 'Nearest'}
          </Text>
        </Pressable>
      </View>

      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={displayed}
        renderItem={renderVenue}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  title: {
    color: COLORS.textPrimary, fontSize: 32, fontWeight: '800',
    marginTop: 8, marginBottom: 4,
  },
  copy: { color: COLORS.textSecondary, fontSize: 16, marginBottom: 16 },
  search: {
    backgroundColor: COLORS.bgElevated, color: COLORS.textPrimary,
    fontSize: 18, padding: 16, borderRadius: 12, marginBottom: 12,
  },
  sortToggle: {
    flexDirection: 'row', backgroundColor: COLORS.bgElevated,
    borderRadius: 10, padding: 4, marginBottom: 12,
  },
  sortSegment: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    borderRadius: 8, paddingVertical: 8,
  },
  sortSegmentSelected: { backgroundColor: COLORS.accent },
  sortText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '700' },
  sortTextSelected: { color: COLORS.onAccent },
  venueActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  venueRowWrap: { flex: 1 },
  stopPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderColor: COLORS.accent,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  stopPillSaved: { backgroundColor: COLORS.accent },
  stopPillText: { color: COLORS.accent, fontSize: 12, fontWeight: '800' },
  stopPillTextSaved: { color: COLORS.onAccent },
  venueWithDistance: { marginBottom: 4 },
  distance: {
    color: COLORS.textMuted, fontSize: 12, fontWeight: '700',
    alignSelf: 'flex-end', marginTop: -6, marginBottom: 6, marginRight: 4,
  },
  listContent: { paddingBottom: 24 },
});
