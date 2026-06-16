import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import AppIcon from '../../../components/ui/AppIcon';
import { COLORS } from '../../../lib/constants';
import { db, functions } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/AuthContext';

const { loadConversation } = require('../../../lib/friends/dm-service');
const {
  buildGroupInfoViewModel,
  getAddableGroupFriends,
  inviteToGroup,
  leaveGroup,
  loadGroupInfoMembers,
  removeGroupMember,
  subscribeGroupCreatableFriends,
} = require('../../../lib/friends/group-service');

export default function GroupInfoScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const conversationId = Array.isArray(id) ? id[0] : id;
  const [conversation, setConversation] = useState(null);
  const [members, setMembers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedMemberUids, setSelectedMemberUids] = useState([]);
  const [search, setSearch] = useState('');
  const [choosingNextAdmin, setChoosingNextAdmin] = useState(false);
  const [nextAdminUid, setNextAdminUid] = useState(null);

  const loadInfo = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    setNotFound(false);
    try {
      const loaded = await loadConversation({ db, conversationId });
      if (!loaded || loaded.type !== 'group') {
        setNotFound(true);
        return;
      }
      const loadedMembers = await loadGroupInfoMembers({ db, conversation: loaded });
      setConversation(loaded);
      setMembers(loadedMembers);
      if (loaded.adminUid !== user?.uid) setAdding(false);
    } catch (err) {
      console.error('Group info load error:', err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [conversationId, user]);

  useEffect(() => {
    loadInfo();
  }, [loadInfo]);

  useEffect(() => {
    if (!user) return undefined;
    return subscribeGroupCreatableFriends({
      db,
      uid: user.uid,
      onChange: setFriends,
      onError: (err) => console.error('Group add friend picker error:', err),
    });
  }, [user]);

  const viewModel = useMemo(() => buildGroupInfoViewModel({
    viewerUid: user?.uid,
    adminUid: conversation?.adminUid,
    members,
  }), [conversation, members, user]);

  const addableFriends = useMemo(() => getAddableGroupFriends({
    viewerUid: user?.uid,
    activeMemberUids: conversation?.memberUids || [],
    friends,
    search,
  }), [conversation, friends, search, user]);

  const remainingSlots = Math.max(0, 25 - (conversation?.memberUids || []).length);
  const addDisabled = selectedMemberUids.length < 1 || selectedMemberUids.length > remainingSlots || mutating;

  const toggleSelected = (uid) => {
    setSelectedMemberUids((current) => (
      current.includes(uid) ? current.filter((item) => item !== uid) : [...current, uid]
    ));
  };

  const addMembers = async () => {
    if (!conversation || addDisabled) return;
    setMutating(true);
    try {
      await inviteToGroup({
        functions,
        conversationId: conversation.id,
        selectedMemberUids,
        activeMemberUids: conversation.memberUids || [],
      });
      setSelectedMemberUids([]);
      setAdding(false);
      await loadInfo();
    } catch (err) {
      Alert.alert('Members not added', err.message);
    } finally {
      setMutating(false);
    }
  };

  const confirmRemove = (member) => {
    Alert.alert('Remove member?', `Remove ${member.label} from this group?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setMutating(true);
          try {
            await removeGroupMember({ functions, conversationId: conversation.id, memberUid: member.uid });
            await loadInfo();
          } catch (err) {
            Alert.alert('Member not removed', err.message);
          } finally {
            setMutating(false);
          }
        },
      },
    ]);
  };

  const remainingMembers = viewModel.members.filter((member) => member.uid !== user?.uid);
  const selectedNextAdmin = remainingMembers.find((member) => member.uid === nextAdminUid);

  const startLeave = () => {
    if (!conversation || !user) return;
    if (conversation.adminUid === user.uid && remainingMembers.length > 0) {
      setNextAdminUid(remainingMembers.length === 1 ? remainingMembers[0].uid : null);
      setChoosingNextAdmin(true);
      return;
    }
    Alert.alert('Leave group?', 'You will lose access to this group.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave group', style: 'destructive', onPress: () => submitLeave() },
    ]);
  };

  const submitLeave = async (adminNextUid = null) => {
    if (!conversation) return;
    setMutating(true);
    try {
      await leaveGroup({ functions, conversationId: conversation.id, nextAdminUid: adminNextUid });
      router.replace('/friends');
    } catch (err) {
      Alert.alert('Could not leave group', err.message);
    } finally {
      setMutating(false);
    }
  };

  const confirmAdminLeave = () => {
    const nextAdmin = remainingMembers.find((member) => member.uid === nextAdminUid);
    if (!nextAdmin) return;
    Alert.alert('Leave group?', `Leave and make ${nextAdmin.label} admin?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: `Leave and make ${nextAdmin.label} admin`, style: 'destructive', onPress: () => submitLeave(nextAdminUid) },
    ]);
  };

  const renderMember = ({ item }) => (
    <View style={styles.memberRow}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{item.label.charAt(0).toUpperCase()}</Text></View>
      <View style={styles.memberCopy}>
        <Text style={styles.memberName}>{item.label}</Text>
        {item.isAdmin ? <Text style={styles.adminBadge}>Admin</Text> : null}
      </View>
      {item.canRemove ? (
        <Pressable style={styles.removeButton} disabled={mutating} onPress={() => confirmRemove(item)}>
          <Text style={styles.removeText}>Remove</Text>
        </Pressable>
      ) : null}
    </View>
  );

  const renderFriend = ({ item }) => {
    const selected = selectedMemberUids.includes(item.uid);
    const label = item.displayName || item.username || item.uid;
    return (
      <Pressable style={styles.memberRow} onPress={() => toggleSelected(item.uid)}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{label.charAt(0).toUpperCase()}</Text></View>
        <View style={styles.memberCopy}>
          <Text style={styles.memberName}>{label}</Text>
          <Text style={styles.mutedText}>{item.username ? `@${item.username}` : 'Friend'}</Text>
        </View>
        <View style={[styles.check, selected && styles.checkSelected]}>
          {selected ? <AppIcon name="checkmark" size={16} color="#ffffff" /> : null}
        </View>
      </Pressable>
    );
  };

  if (notFound) {
    return (
      <View style={styles.screen}>
        <View style={styles.centerCard}>
          <Text style={styles.title}>Conversation not found</Text>
          <Pressable style={styles.primaryButton} onPress={() => router.back()}>
            <Text style={styles.primaryText}>Go back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
          <AppIcon name="chevron-back" size={24} color={COLORS.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{conversation?.name || 'Group info'}</Text>
      </View>

      <Text style={styles.sectionTitle}>Members</Text>
      {loading ? <Text style={styles.mutedText}>Loading members...</Text> : null}
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={viewModel.members}
        renderItem={renderMember}
        keyExtractor={(item) => item.uid}
        scrollEnabled={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={!loading ? <Text style={styles.mutedText}>No active members</Text> : null}
      />

      {viewModel.actions.canAddMembers ? (
        <View style={styles.panel}>
          <Pressable style={styles.secondaryButton} onPress={() => setAdding((value) => !value)} disabled={mutating}>
            <Text style={styles.secondaryText}>Add members</Text>
          </Pressable>
          {adding ? (
            <View style={styles.addPanel}>
              <TextInput
                style={styles.input}
                placeholder="Search Friends"
                placeholderTextColor={COLORS.textPlaceholder}
                value={search}
                onChangeText={setSearch}
              />
              <Text style={styles.mutedText}>{selectedMemberUids.length}/{remainingSlots} selected</Text>
              <FlatList
                contentInsetAdjustmentBehavior="automatic"
                data={addableFriends}
                renderItem={renderFriend}
                keyExtractor={(item) => item.uid}
                scrollEnabled={false}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={<Text style={styles.mutedText}>No Friends available to add</Text>}
              />
              <Pressable style={[styles.primaryButton, addDisabled && styles.disabled]} disabled={addDisabled} onPress={addMembers}>
                <Text style={styles.primaryText}>Add selected members</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}

      {choosingNextAdmin ? (
        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Choose next admin</Text>
          {remainingMembers.map((member) => (
            <Pressable key={member.uid} style={styles.memberRow} onPress={() => setNextAdminUid(member.uid)}>
              <Text style={styles.memberName}>{member.label}</Text>
              <View style={[styles.check, nextAdminUid === member.uid && styles.checkSelected]}>
                {nextAdminUid === member.uid ? <AppIcon name="checkmark" size={16} color="#ffffff" /> : null}
              </View>
            </Pressable>
          ))}
          <Pressable style={[styles.primaryButton, (!nextAdminUid || mutating) && styles.disabled]} disabled={!nextAdminUid || mutating} onPress={confirmAdminLeave}>
            <Text style={styles.primaryText}>{selectedNextAdmin ? `Leave and make ${selectedNextAdmin.label} admin` : 'Choose next admin'}</Text>
          </Pressable>
        </View>
      ) : null}

      {viewModel.actions.canLeave ? (
        <Pressable style={styles.leaveButton} disabled={mutating} onPress={startLeave}>
          <Text style={styles.leaveText}>Leave group</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, backgroundColor: COLORS.bg, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  backButton: { padding: 4 },
  title: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '800', flex: 1 },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 10 },
  listContent: { gap: 10 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.bgElevated, borderRadius: 16, padding: 12, marginBottom: 8 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.bgCard, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.accent, fontWeight: '800' },
  memberCopy: { flex: 1 },
  memberName: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '800' },
  mutedText: { color: COLORS.textMuted, fontSize: 13, marginTop: 2 },
  adminBadge: { color: COLORS.accent, fontSize: 12, fontWeight: '800', marginTop: 2 },
  removeButton: { backgroundColor: COLORS.bgCard, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8 },
  removeText: { color: COLORS.textMuted, fontWeight: '800', fontSize: 12 },
  panel: { marginTop: 20 },
  addPanel: { marginTop: 12 },
  input: { minHeight: 46, borderRadius: 16, backgroundColor: COLORS.bgElevated, color: COLORS.textPrimary, paddingHorizontal: 14, fontSize: 15, marginBottom: 10 },
  primaryButton: { backgroundColor: COLORS.accent, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  primaryText: { color: '#ffffff', fontWeight: '800' },
  secondaryButton: { backgroundColor: COLORS.bgElevated, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center' },
  secondaryText: { color: COLORS.accent, fontWeight: '800' },
  leaveButton: { backgroundColor: COLORS.bgCard, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', marginTop: 28 },
  leaveText: { color: '#b42318', fontWeight: '800' },
  disabled: { opacity: 0.5 },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: COLORS.textMuted, alignItems: 'center', justifyContent: 'center' },
  checkSelected: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  centerCard: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
});
