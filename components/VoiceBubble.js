import { useState, useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDownloadURL, ref } from 'firebase/storage';
import { COLORS } from '../lib/constants';
import { isVoicePlayableForViewer } from '../lib/friends/voice-service';
import { createVoicePlaybackAsync } from '../lib/audio/audio-adapter';

function formatDurationMs(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function VoiceBubble({ message, isMine, db, storage, user }) {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const expired = !isVoicePlayableForViewer(message, {}, Date.now());
  const saved = Array.isArray(message.savedBy) && message.savedBy.length > 0;

  const loadAndPlay = useCallback(async () => {
    if (expired) return;
    if (sound) {
      await sound.play();
      setIsPlaying(true);
      return;
    }

    setLoading(true);
    try {
      const url = audioUrl || await getDownloadURL(ref(storage, message.storagePath));
      setAudioUrl(url);

      const newSound = await createVoicePlaybackAsync(url, (status) => {
        setPlaybackPosition(status.positionMillis || 0);
        if (status.didJustFinish) {
          setIsPlaying(false);
          setPlaybackPosition(0);
        }
      });

      setSound(newSound);
      await newSound.play();
      setIsPlaying(true);
    } catch (err) {
      console.error('Voice playback error:', err);
    } finally {
      setLoading(false);
    }
  }, [audioUrl, expired, message.storagePath, sound, storage]);

  const pause = useCallback(async () => {
    if (sound) {
      await sound.pause();
      setIsPlaying(false);
    }
  }, [sound]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      loadAndPlay();
    }
  }, [isPlaying, loadAndPlay, pause]);

  useEffect(() => () => {
    sound?.unload();
  }, [sound]);

  return (
    <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
      <Pressable onPress={togglePlay} disabled={expired || loading} style={styles.playButton}>
        {loading ? (
          <Ionicons name="sync" size={18} color={isMine ? '#ffffff' : COLORS.accent} />
        ) : (
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={18}
            color={isMine ? '#ffffff' : COLORS.accent}
          />
        )}
      </Pressable>
      <View style={styles.info}>
        <Text style={[styles.duration, isMine ? styles.durationMine : styles.durationTheirs]}>
          {expired ? 'Expired' : formatDurationMs(message.durationMs || 0)}
        </Text>
        {!saved && !expired && (
          <Text style={[styles.badge, isMine ? styles.badgeMine : styles.badgeTheirs]}>Temp</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 120,
  },
  bubbleMine: {
    backgroundColor: COLORS.accent,
  },
  bubbleTheirs: {
    backgroundColor: COLORS.bgElevated,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  info: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  duration: {
    fontSize: 14,
    fontWeight: '700',
  },
  durationMine: {
    color: '#ffffff',
  },
  durationTheirs: {
    color: COLORS.textPrimary,
  },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeMine: {
    color: 'rgba(255,255,255,0.8)',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  badgeTheirs: {
    color: COLORS.textMuted,
    backgroundColor: COLORS.bgCard,
  },
});
