import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../lib/constants';
import MediaImage from '../components/ui/media-image';

const LINK_BLUE = '#155e6d';
const BORDER = '#eeeeee';

const CITY_DISPLAY = {
  nyc: 'New York, NY',
  boston: 'Boston, MA',
  chicago: 'Chicago, IL',
  sf: 'San Francisco, CA',
};

function ProfileAvatar({ profile, user, size = 128 }) {
  const letter = (profile?.displayName || profile?.username || user?.email || '?').charAt(0).toUpperCase();
  const avatarStyle = { width: size, height: size, borderRadius: size / 2 };

  if (profile?.photoURL) {
    return <MediaImage source={{ uri: profile.photoURL }} style={[styles.avatarImage, avatarStyle]} />;
  }

  return (
    <View style={[styles.avatar, avatarStyle]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.42 }]}>{letter}</Text>
    </View>
  );
}

function EditField({ label, value, locked, accountSettings }) {
  return (
    <Pressable
      style={[styles.fieldRow, accountSettings && styles.accountRow]}
      onPress={() => Alert.alert(label, 'Field editing coming soon.')}
    >
      <View style={styles.fieldLabelWrap}>
        <Text style={[styles.fieldLabel, accountSettings && styles.accountLabel]}>{label}</Text>
        {locked ? <Ionicons name="lock-closed" size={16} color={LINK_BLUE} style={styles.lockIcon} /> : null}
      </View>
      <View style={styles.fieldRight}>
        {value ? <Text style={styles.fieldValue} numberOfLines={1}>{value}</Text> : null}
        <Ionicons name="chevron-forward" size={20} color="#c7c7c7" />
      </View>
    </Pressable>
  );
}

export default function EditProfileScreen() {
  const { user, profile } = useAuth();
  const displayName = profile?.displayName || 'User';
  const username = profile?.username ? `@${profile.username}` : '@username';
  const city = CITY_DISPLAY[profile?.city] || profile?.city || 'Add home city';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.screen}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={COLORS.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Edit profile</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.photoBlock}>
          <ProfileAvatar profile={profile} user={user} />
          <Pressable onPress={() => Alert.alert('Edit profile photo', 'Photo editing coming soon.')}>
            <Text style={styles.photoLink}>Edit profile photo</Text>
          </Pressable>
        </View>

        <View style={styles.fields}>
          <EditField label="Name" value={displayName} />
          <EditField label="Username" value={username} />
          <EditField label="Home city" value={city} />
          <EditField label="Bio" value={profile?.bio || 'Add a bio'} />
          <EditField label="Instagram" value={profile?.instagram || ''} locked={!profile?.instagram} />
          <EditField label="TikTok" value={profile?.tiktok || ''} locked={!profile?.tiktok} />
          <EditField label="Account settings" accountSettings />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  screen: { flexGrow: 1, paddingBottom: 40 },
  header: {
    height: 56,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { color: COLORS.textPrimary, fontSize: 28, fontWeight: '800' },
  headerSpacer: { width: 56 },
  photoBlock: { alignItems: 'center', paddingTop: 20, paddingBottom: 32 },
  avatar: {
    backgroundColor: COLORS.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d6d6d6',
  },
  avatarImage: { backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: '#d6d6d6' },
  avatarText: { color: COLORS.accent, fontWeight: '900' },
  photoLink: { color: LINK_BLUE, fontSize: 14, fontWeight: '700', marginTop: 16 },
  fields: { paddingHorizontal: 20 },
  fieldRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  accountRow: { marginTop: 24, borderBottomWidth: 0 },
  fieldLabelWrap: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  fieldLabel: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800' },
  accountLabel: { color: LINK_BLUE },
  lockIcon: { marginLeft: 9, marginTop: 2 },
  fieldRight: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flex: 1.25 },
  fieldValue: { color: '#9ca3af', fontSize: 16, marginRight: 4, flexShrink: 1, textAlign: 'right' },
});
