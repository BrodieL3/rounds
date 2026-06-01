import { useMemo, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../lib/constants';
import { db, functions } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';

const {
  buildGroupCreateRequest,
  createGroupConversation,
  subscribeGroupCreatableFriends,
} = require('../../lib/friends/group-service');

export default function NewConversationScreen() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [friends, setFriends] = useState([]);
  const [selectedUids, setSelectedUids] = useState([]);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return undefined;

    return subscribeGroupCreatableFriends({
      db,
      uid: user.uid,
      onChange: setFriends,
      onError: (err) => console.error('Group friend picker error:', err),
    });
  }, [user]);

  const filteredFriends = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((friend) => (
      `${friend.displayName || ''} ${friend.username || ''}`.toLowerCase().includes(q)
    ));
  }, [friends, search]);

  const createDisabled = useMemo(() => {
    try {
      buildGroupCreateRequest({ name, selectedMemberUids: selectedUids });
      return false;
    } catch (err) {
      return true;
    }
  }, [name, selectedUids]);

  const toggleFriend = (uid) => {
    setSelectedUids((current) => (
      current.includes(uid) ? current.filter((item) => item !== uid) : [...current, uid]
    ));
  };

  const create = async () => {
    if (creating || createDisabled) return;
    setCreating(true);
    try {
      const result = await createGroupConversation({ functions, name, selectedMemberUids: selectedUids });
      router.replace({ pathname: '/conversation/[id]', params: { id: result.conversationId } });
    } catch (err) {
      Alert.alert('Group not created', err.message);
    } finally {
      setCreating(false);
    }
  };

  const renderFriend = ({ item }) => {
    const selected = selectedUids.includes(item.uid);
    const displayName = item.displayName || item.username || item.uid;

    return (
      <Pressable style={styles.friendRow} onPress={() => toggleFriend(item.uid)}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.friendCopy}>
          <Text style={styles.friendName}>{displayName}</Text>
          <Text style={styles.friendHandle}>{item.username ? `@${item.username}` : 'Friend'}</Text>
        </View>
        <View style={[styles.check, selected && styles.checkSelected]}>
          {selected ? <Ionicons name="checkmark" size={16} color="#ffffff" /> : null}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Create group</Text>
        <Pressable
          style={[styles.createButton, (createDisabled || creating) && styles.createButtonDisabled]}
          disabled={createDisabled || creating}
          onPress={create}
        >
          <Text style={styles.createText}>Create group</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>Group name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Friday night"
        placeholderTextColor={COLORS.textPlaceholder}
        maxLength={60}
      />

      <Text style={styles.label}>Friends</Text>
      <TextInput
        style={styles.input}
        value={search}
        onChangeText={setSearch}
        placeholder="Search friends"
        placeholderTextColor={COLORS.textPlaceholder}
      />
      <Text style={styles.helper}>{selectedUids.length}/24 selected · pick at least 2</Text>

      <FlatList
        data={filteredFriends}
        renderItem={renderFriend}
        keyExtractor={(item) => item.uid}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={(
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Friends found</Text>
            <Text style={styles.emptyBody}>Add friends from profiles before creating a group.</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 20, paddingTop: 54 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 22 },
  backButton: { padding: 4 },
  title: { flex: 1, color: COLORS.textPrimary, fontSize: 24, fontWeight: '800' },
  createButton: { borderRadius: 16, backgroundColor: COLORS.accent, paddingHorizontal: 14, paddingVertical: 10 },
  createButtonDisabled: { opacity: 0.5 },
  createText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  label: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '800', marginBottom: 8 },
  input: {
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: COLORS.bgElevated,
    color: COLORS.textPrimary,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 14,
  },
  helper: { color: COLORS.textMuted, fontSize: 12, marginBottom: 10 },
  listContent: { gap: 10, paddingBottom: 24 },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    backgroundColor: COLORS.bgElevated,
    padding: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: COLORS.accent, fontSize: 16, fontWeight: '800' },
  friendCopy: { flex: 1 },
  friendName: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '800' },
  friendHandle: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkSelected: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  emptyCard: { alignItems: 'center', padding: 28, borderRadius: 20, borderWidth: 1, borderColor: COLORS.bgCard },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800' },
  emptyBody: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
