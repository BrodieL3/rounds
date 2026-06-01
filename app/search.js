import { useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, TextInput, Pressable, FlatList, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import {
  collection, query, where, getDocs, limit, orderBy,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../lib/constants';

export default function SearchScreen() {
  const { user } = useAuth();
  const [queryText, setQueryText] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async () => {
    if (!queryText.trim() || queryText.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const q = query(
        collection(db, 'users'),
        where('username', '>=', queryText.toLowerCase()),
        where('username', '<=', queryText.toLowerCase() + '\uf8ff'),
        limit(20)
      );
      const snap = await getDocs(q);
      const users = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((u) => u.uid !== user?.uid);
      setResults(users);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, [queryText, user]);

  const renderUser = ({ item }) => (
    <Pressable
      style={styles.userRow}
      onPress={() => router.push(`/user/${item.username}`)}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {(item.displayName || item.username || '?').charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.displayName || item.username}</Text>
        <Text style={styles.userHandle}>@{item.username}</Text>
      </View>
    </Pressable>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.screen}
    >
      <Text style={styles.title}>Find people</Text>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by username..."
          placeholderTextColor={COLORS.textPlaceholder}
          value={queryText}
          onChangeText={setQueryText}
          autoCapitalize="none"
          autoFocus
          onSubmitEditing={search}
        />
        <Pressable style={styles.searchBtn} onPress={search}>
          <Text style={styles.searchBtnText}>Search</Text>
        </Pressable>
      </View>

      <FlatList
        data={results}
        renderItem={renderUser}
        keyExtractor={(item) => item.uid}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          queryText.length >= 2 && !loading ? (
            <Text style={styles.empty}>No users found</Text>
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
    marginTop: 48, marginBottom: 16,
  },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  searchInput: {
    flex: 1, backgroundColor: COLORS.bgElevated, color: COLORS.textPrimary,
    fontSize: 16, padding: 14, borderRadius: 12,
  },
  searchBtn: {
    backgroundColor: COLORS.accent, paddingHorizontal: 16,
    borderRadius: 12, justifyContent: 'center',
  },
  searchBtnText: { color: COLORS.bg, fontWeight: '800', fontSize: 14 },
  userRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.bgElevated, padding: 14,
    borderRadius: 12, marginBottom: 8,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.bgCard, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: COLORS.accent, fontSize: 18, fontWeight: '700' },
  userInfo: { flex: 1 },
  userName: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700' },
  userHandle: { color: COLORS.textMuted, fontSize: 13, marginTop: 2 },
  empty: { color: COLORS.textMuted, textAlign: 'center', marginTop: 24 },
});
