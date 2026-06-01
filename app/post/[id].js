import { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView, Pressable, TextInput, Image, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import {
  doc, onSnapshot, collection, query, addDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, COHORT_LABELS } from '../../lib/constants';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user, profile } = useAuth();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, 'posts', id), (snap) => {
      if (snap.exists()) {
        setPost({ id: snap.id, ...snap.data() });
      } else {
        setPost(null);
      }
      setLoading(false);
    });
    return unsub;
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, 'posts', id, 'comments'));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      items.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || a.createdAt || 0;
        const bTime = b.createdAt?.toDate?.() || b.createdAt || 0;
        return new Date(aTime) - new Date(bTime);
      });
      setComments(items);
    }, (err) => {
      console.error('Comments snapshot error:', err);
    });
    return unsub;
  }, [id]);

  const toggleLike = async () => {
    if (!user || !post) return;
    const current = Array.isArray(post.likedBy) ? post.likedBy : [];
    const liked = current.includes(user.uid);
    const ref = doc(db, 'posts', post.id);
    try {
      if (liked) {
        const next = current.filter((uid) => uid !== user.uid);
        await updateDoc(ref, {
          likedBy: next,
          likes: Math.max((post.likes || 0) - 1, 0),
        });
      } else {
        const next = [...current, user.uid];
        await updateDoc(ref, {
          likedBy: next,
          likes: (post.likes || 0) + 1,
        });
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const submitComment = async () => {
    if (!commentText.trim() || !user || !post) return;
    try {
      await addDoc(collection(db, 'posts', post.id, 'comments'), {
        userId: user.uid,
        username: profile?.username || 'user',
        displayName: profile?.displayName || 'User',
        text: commentText.trim(),
        createdAt: serverTimestamp(),
      });
      setCommentText('');
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const timeSince = (date) => {
    if (!date) return 'now';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'now';
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Loading...</Text>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Post not found</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const isLiked = Array.isArray(post.likedBy) && post.likedBy.includes(user?.uid);
  const sentimentColors = {
    loved: COLORS.success,
    fine: COLORS.accent,
    disliked: COLORS.danger,
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex}
    >
      <ScrollView contentContainerStyle={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.author}>@{post.username || 'user'}</Text>
          <Text style={styles.time}>{timeSince(post.createdAt?.toDate?.() || post.createdAt)}</Text>
        </View>

        <Text style={styles.venueName}>{post.venueName}</Text>
        <Text style={styles.meta}>
          {COHORT_LABELS[post.cohort]} ·{' '}
          <Text style={{ color: sentimentColors[post.sentiment] }}>
            {post.sentiment === 'loved' ? 'Loved it' : post.sentiment === 'fine' ? 'It was fine' : "Didn't like it"}
          </Text>
        </Text>

        {post.description ? (
          <Text style={styles.description}>{post.description}</Text>
        ) : null}

        {(post.mediaUrls || post.photoURLs) && (post.mediaUrls || post.photoURLs).length > 0 && (
          <View style={styles.photosWrap}>
            {(post.mediaUrls || post.photoURLs).map((url, i) => (
              <Image key={i} source={{ uri: url }} style={styles.photo} />
            ))}
          </View>
        )}

        <Pressable style={styles.likeRow} onPress={toggleLike}>
          <Text style={[styles.likeText, isLiked && styles.likeTextActive]}>
            {isLiked ? '❤️' : '🤍'} {post.likes || 0}
          </Text>
        </Pressable>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Comments</Text>
        {comments.length === 0 ? (
          <Text style={styles.empty}>No comments yet</Text>
        ) : (
          comments.map((c) => (
            <View key={c.id} style={styles.commentCard}>
              <Text style={styles.commentAuthor}>@{c.username || 'user'}</Text>
              <Text style={styles.commentText}>{c.text}</Text>
              <Text style={styles.commentTime}>{timeSince(c.createdAt?.toDate?.() || c.createdAt)}</Text>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.commentInput}
          placeholder="Add a comment..."
          placeholderTextColor={COLORS.textPlaceholder}
          value={commentText}
          onChangeText={setCommentText}
          multiline
        />
        <Pressable style={styles.sendBtn} onPress={submitComment}>
          <Text style={styles.sendBtnText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.bg },
  screen: { padding: 24, paddingBottom: 100 },
  title: { color: COLORS.textPrimary, fontSize: 28, fontWeight: '800', marginTop: 48 },
  backBtn: {
    marginTop: 16, backgroundColor: COLORS.bgElevated,
    padding: 16, borderRadius: 12, alignItems: 'center',
  },
  backBtnText: { color: COLORS.accent, fontWeight: '700', fontSize: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 48, marginBottom: 8 },
  author: { color: COLORS.accent, fontSize: 14, fontWeight: '700' },
  time: { color: COLORS.textMuted, fontSize: 13 },
  venueName: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '800' },
  meta: { color: COLORS.textMuted, fontSize: 14, marginTop: 4 },
  description: {
    color: COLORS.textSecondary, fontSize: 15,
    marginTop: 12, lineHeight: 22,
  },
  photosWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  photo: { width: '100%', height: 240, borderRadius: 12 },
  likeRow: { marginTop: 16, alignSelf: 'flex-start' },
  likeText: { color: COLORS.textMuted, fontSize: 16, fontWeight: '600' },
  likeTextActive: { color: COLORS.danger },
  divider: {
    height: 1, backgroundColor: COLORS.bgCard,
    marginVertical: 20,
  },
  sectionTitle: {
    color: COLORS.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 12,
  },
  empty: { color: COLORS.textMuted, fontSize: 14, marginBottom: 12 },
  commentCard: {
    backgroundColor: COLORS.bgElevated, padding: 12,
    borderRadius: 12, marginBottom: 8,
  },
  commentAuthor: { color: COLORS.accent, fontSize: 13, fontWeight: '700', marginBottom: 2 },
  commentText: { color: COLORS.textPrimary, fontSize: 14, lineHeight: 20 },
  commentTime: { color: COLORS.textMuted, fontSize: 11, marginTop: 4 },
  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, paddingBottom: 24,
    borderTopWidth: 1, borderTopColor: COLORS.bgCard,
    backgroundColor: COLORS.bg,
  },
  commentInput: {
    flex: 1, backgroundColor: COLORS.bgElevated,
    color: COLORS.textPrimary, fontSize: 15,
    padding: 12, borderRadius: 12, maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: COLORS.accent, paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 12,
  },
  sendBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
});
