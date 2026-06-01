/**
 * Spotify Layer 3 prototype test (ES module).
 *
 * Flow:
 *   1. Prints auth URL → open in browser, log in, approve.
 *   2. Spotify redirects to localhost:3000/?code=...&state=...
 *   3. Exchanges code for tokens.
 *   4. Fetches top artists, top tracks, audio features.
 *   5. Builds genre vector + audio-feature vector.
 *   6. Saves sample to assets/spotify-layer3-sample.json
 *
 * Run:
 *   SPOTIFY_CLIENT_SECRET=xxx node scripts/spotify-layer3-test.mjs
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CLIENT_ID = '3834d7d7f4574316b902ccdc538921f2';
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000';
const PORT = 3000;
const OUTPUT_PATH = path.join(__dirname, '..', 'assets', 'spotify-layer3-sample.json');

const API_BASE = 'https://api.spotify.com/v1';
const AUTH_BASE = 'https://accounts.spotify.com';
const SCOPES = 'user-top-read user-read-private';

function getAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    state,
  });
  return `${AUTH_BASE}/authorize?${params.toString()}`;
}

async function exchangeCode(code) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });
  const res = await fetch(`${AUTH_BASE}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const json = await res.json();
  if (!res.ok) return { error: json.error_description || json.error || `HTTP ${res.status}` };
  return json;
}

async function spotifyGet(path, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: json.error?.message || `HTTP ${res.status}` };
  return { ok: true, data: json };
}

function buildGenreVector(artists) {
  const freq = {};
  let total = 0;
  for (const a of artists) {
    for (const g of a.genres || []) {
      freq[g] = (freq[g] || 0) + 1;
      total++;
    }
  }
  if (total > 0) {
    for (const k of Object.keys(freq)) freq[k] = freq[k] / total;
  }
  return { vector: freq, totalGenres: total };
}

function buildAudioFeatureVector(features) {
  if (!features || features.length === 0) return null;
  const keys = ['danceability', 'energy', 'valence', 'tempo', 'acousticness', 'instrumentalness'];
  const sum = {};
  let count = 0;
  for (const f of features) {
    if (!f) continue;
    count++;
    for (const k of keys) sum[k] = (sum[k] || 0) + (f[k] ?? 0);
  }
  if (count === 0) return null;
  const avg = {};
  for (const k of keys) avg[k] = sum[k] / count;
  return avg;
}

function generateState() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function fetchAll(accessToken) {
  console.log('\n[1] Fetching top artists (long_term, limit=50)...');
  const artistsRes = await spotifyGet('/me/top/artists?limit=50&time_range=long_term', accessToken);
  if (!artistsRes.ok) throw new Error(`top artists: ${artistsRes.error}`);
  const artists = artistsRes.data;
  console.log(`  → ${artists.items?.length || 0} artists`);

  console.log('[2] Fetching top tracks (long_term, limit=50)...');
  const tracksRes = await spotifyGet('/me/top/tracks?limit=50&time_range=long_term', accessToken);
  if (!tracksRes.ok) throw new Error(`top tracks: ${tracksRes.error}`);
  const tracks = tracksRes.data;
  console.log(`  → ${tracks.items?.length || 0} tracks`);

  const trackIds = (tracks.items || []).map(t => t.id).filter(Boolean);
  let audioFeatures = null;
  if (trackIds.length > 0) {
    console.log('[3] Fetching audio features...');
    const ids = trackIds.slice(0, 100).join(',');
    const afRes = await spotifyGet(`/audio-features?ids=${ids}`, accessToken);
    if (afRes.ok) {
      audioFeatures = afRes.data;
      console.log(`  → ${audioFeatures.audio_features?.length || 0} feature sets`);
    } else {
      console.log(`  → FAIL: ${afRes.error}`);
    }
  }

  console.log('[4] Building vectors...');
  const genreVec = buildGenreVector(artists.items || []);
  const audioVec = buildAudioFeatureVector(audioFeatures?.audio_features || []);

  const topGenres = Object.entries(genreVec.vector)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  console.log(`  → Top genres: ${topGenres.map(([g, s]) => `${g}(${(s * 100).toFixed(1)}%)`).join(', ')}`);
  console.log(`  → Audio vector:`, audioVec);

  const output = {
    timestamp: new Date().toISOString(),
    topArtists: (artists.items || []).slice(0, 10).map(a => ({
      id: a.id,
      name: a.name,
      genres: a.genres,
      popularity: a.popularity,
      images: (a.images || []).slice(0, 1),
    })),
    topTracks: (tracks.items || []).slice(0, 10).map(t => ({
      id: t.id,
      name: t.name,
      artists: t.artists.map(x => x.name),
      album: t.album?.name,
      previewUrl: t.preview_url,
    })),
    genreVector: genreVec.vector,
    topGenres,
    audioFeatureVector: audioVec,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`\nWrote ${OUTPUT_PATH}`);
}

async function main() {
  if (!CLIENT_SECRET) {
    console.error('Set SPOTIFY_CLIENT_SECRET env var (from Spotify Dashboard > Settings)');
    process.exit(1);
  }

  const state = generateState();
  const authUrl = getAuthUrl(state);

  console.log('=== Spotify Layer 3 Prototype ===\n');
  console.log('Open this URL in your browser and log in:\n');
  console.log(authUrl);
  console.log('\nWaiting for callback on localhost:3000 ...\n');

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    const returnedState = url.searchParams.get('state');

    if (error) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end(`Spotify error: ${error}`);
      server.close();
      console.error(`Auth error: ${error}`);
      process.exit(1);
    }

    if (!code) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>Waiting for authorization...</h1>');
      return;
    }

    if (returnedState !== state) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('State mismatch');
      server.close();
      console.error('State mismatch');
      process.exit(1);
    }

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>Authorization successful! You can close this tab.</h1>');
    server.close();

    console.log('Got auth code. Exchanging for tokens...');
    const tokenRes = await exchangeCode(code);
    if (tokenRes.error) {
      console.error(`Token exchange failed: ${tokenRes.error}`);
      process.exit(1);
    }
    console.log(`Access token acquired (expires in ${tokenRes.expires_in}s)`);

    try {
      await fetchAll(tokenRes.access_token);
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  });

  server.listen(PORT);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
