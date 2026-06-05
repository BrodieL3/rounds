import { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { setDoc, doc } from 'firebase/firestore';
import { useAuthRequest, makeRedirectUri } from 'expo-auth-session';
import { auth, db } from '../../lib/firebase';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { getTopArtists, buildGenreVector } from '../../lib/spotify';
import { COLORS } from '../../lib/constants';

const CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID || '3834d7d7f4574316b902ccdc538921f2';
const SCOPES = ['user-top-read', 'user-read-private'];

const discovery = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

export default function SpotifyOnboardingScreen() {
  const { data, update } = useOnboarding();
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(data.spotifyConnected || false);
  const [topGenres, setTopGenres] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  const redirectUri = makeRedirectUri({
    scheme: 'rounds',
    path: 'spotify-callback',
  });

  console.log('[Spotify] Redirect URI:', redirectUri);

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: CLIENT_ID,
      scopes: SCOPES,
      usePKCE: true,
      redirectUri,
    },
    discovery
  );

  useEffect(() => {
    console.log('[Spotify] Response:', response?.type, response?.error);
    if (response?.type === 'success') {
      exchangeAndFetch(response.params.code);
    } else if (response?.type === 'error') {
      const msg = response.error?.description || response.params?.error_description || 'Authorization failed';
      console.error('[Spotify] Auth error:', msg);
      setErrorMsg(msg);
      Alert.alert('Spotify error', msg);
    }
  }, [response]);

  async function exchangeAndFetch(code) {
    setLoading(true);
    setErrorMsg('');
    try {
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: CLIENT_ID,
        code_verifier: request.codeVerifier,
      });

      console.log('[Spotify] Exchanging code...');
      const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      const tokens = await res.json();
      console.log('[Spotify] Token response:', res.status);

      if (!res.ok) {
        throw new Error(tokens.error_description || tokens.error || `HTTP ${res.status}`);
      }

      const artistsRes = await getTopArtists(tokens.access_token, 50, 'long_term');
      if (!artistsRes.ok) throw new Error(artistsRes.error);

      const items = artistsRes.data?.items || [];
      const genreVec = buildGenreVector(items);

      update({
        spotifyConnected: true,
        spotifyTokens: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: Date.now() + tokens.expires_in * 1000,
        },
        genreVector: genreVec.vector,
      });

      const sorted = Object.entries(genreVec.vector)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([g, s]) => ({ genre: g, score: Math.round(s * 100) }));
      setTopGenres(sorted);
      setConnected(true);
    } catch (err) {
      console.error('[Spotify] Exchange error:', err);
      setErrorMsg(err.message);
      Alert.alert('Spotify error', err.message);
    } finally {
      setLoading(false);
    }
  }

  const openSpotify = async () => {
    if (!request) {
      Alert.alert('Not ready', 'Auth request is still initializing. Try again in a moment.');
      return;
    }
    setErrorMsg('');
    console.log('[Spotify] Opening auth with redirect:', redirectUri);
    try {
      await promptAsync({ useProxy: true });
    } catch (err) {
      console.error('[Spotify] promptAsync error:', err);
      setErrorMsg(err.message);
    }
  };

  const finish = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const user = auth.currentUser;
      console.log('[Finish] Current user:', user?.uid);
      if (!user) {
        Alert.alert('Error', 'No authenticated user found. Please go back and sign in.');
        setLoading(false);
        return;
      }

      const payload = {
        uid: user.uid,
        phone: data.phone || null,
        email: data.email || user.email || null,
        displayName: data.displayName || null,
        username: data.username || null,
        photoURL: data.photoURL || null,
        city: data.city || null,
        cohortPreferences: data.cohortPreferences || [],
        spotifyConnected: data.spotifyConnected || false,
        spotifyTokens: data.spotifyTokens || null,
        genreVector: data.genreVector || null,
        followers: [],
        following: [],
        onboardingComplete: true,
        createdAt: new Date().toISOString(),
      };

      console.log('[Finish] Writing user doc...');
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, payload, { merge: true });

      console.log('[Finish] Success, navigating to tabs');
      router.replace('/(tabs)/list');
    } catch (err) {
      console.error('[Finish] Error:', err);
      setErrorMsg(err.message);
      Alert.alert('Error saving profile', err.message + '\n\nMake sure Firestore rules are deployed and you have internet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.screen}>
      <Text style={styles.title}>Connect Spotify</Text>
      <Text style={styles.copy}>
        Link your Spotify so we can recommend events based on your music taste.
      </Text>

      {connected ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Connected</Text>
          {topGenres.length > 0 && (
            <>
              <Text style={styles.cardSub}>Top genres:</Text>
              {topGenres.map((g) => (
                <Text key={g.genre} style={styles.genreLine}>
                  {g.genre} ({g.score}%)
                </Text>
              ))}
            </>
          )}
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardText}>Discover events matched to your taste</Text>
          {errorMsg ? (
            <Text style={styles.errorText}>{errorMsg}</Text>
          ) : null}
          <Pressable
            style={styles.spotifyBtn}
            onPress={openSpotify}
            disabled={!request || loading}
          >
            <Text style={styles.spotifyBtnText}>
              {loading ? 'Opening...' : 'Connect Spotify'}
            </Text>
          </Pressable>
          <Text style={styles.uriText}>Redirect URI: {redirectUri}</Text>
          <Text style={styles.uriHint}>Add this exact URL to your Spotify app settings</Text>
        </View>
      )}

      <Pressable style={styles.button} onPress={finish} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Finishing...' : 'Finish'}</Text>
      </Pressable>

      {!connected && (
        <Pressable onPress={finish} disabled={loading} style={styles.skip}>
          <Text style={styles.skipText}>Skip and finish</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, backgroundColor: COLORS.bg, padding: 24, justifyContent: 'center' },
  title: { color: COLORS.textPrimary, fontSize: 32, fontWeight: '800' },
  copy: { color: COLORS.textSecondary, fontSize: 16, marginTop: 8, marginBottom: 24 },
  card: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  cardTitle: { color: COLORS.success, fontSize: 20, fontWeight: '700' },
  cardSub: { color: COLORS.textSecondary, fontSize: 14, marginTop: 12 },
  genreLine: { color: COLORS.textPrimary, fontSize: 15, marginTop: 4, fontWeight: '600' },
  cardText: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 12 },
  errorText: {
    color: COLORS.danger, fontSize: 13, marginBottom: 12,
    textAlign: 'center', fontWeight: '600',
  },
  spotifyBtn: {
    backgroundColor: '#1DB954',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  spotifyBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  uriText: {
    color: COLORS.textMuted, fontSize: 11, marginTop: 12,
    fontFamily: 'monospace', textAlign: 'center',
  },
  uriHint: {
    color: COLORS.textMuted, fontSize: 11, marginTop: 4, textAlign: 'center',
  },
  button: {
    backgroundColor: COLORS.hero,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  skip: { marginTop: 20, alignItems: 'center' },
  skipText: { color: COLORS.accent, fontWeight: '700', fontSize: 14 },
});
