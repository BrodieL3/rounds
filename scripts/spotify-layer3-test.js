/**
 * Spotify Layer 3 prototype test.
 *
 * Flow:
 *   1. Prints auth URL → open in browser, log in, approve.
 *   2. Spotify redirects to localhost:3000/?code=...&state=...
 *   3. This script exchanges code for tokens.
 *   4. Fetches top artists, top tracks, audio features.
 *   5. Builds genre vector + audio-feature vector.
 *   6. Saves sample to assets/spotify-layer3-sample.json
 *
 * Run:
 *   SPOTIFY_CLIENT_SECRET=xxx node scripts/spotify-layer3-test.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const CLIENT_ID = '3834d7d7f4574316b902ccdc538921f2';
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000';
const PORT = 3000;
const OUTPUT_PATH = path.join(__dirname, '..', 'assets', 'spotify-layer3-sample.json');

const { getAuthUrl, exchangeCode, getTopArtists, getTopTracks, getAudioFeatures, buildGenreVector, buildAudioFeatureVector } = require('../lib/spotify.js');

function generateState() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function fetchAll(accessToken) {
  console.log('\n[1] Fetching top artists (long_term, limit=50)...');
  const artistsRes = await getTopArtists(accessToken, 50, 'long_term');
  if (!artistsRes.ok) throw new Error(`top artists: ${artistsRes.error}`);
  const artists = artistsRes.data;
  console.log(`  → ${artists.items?.length || 0} artists`);

  console.log('[2] Fetching top tracks (long_term, limit=50)...');
  const tracksRes = await getTopTracks(accessToken, 50, 'long_term');
  if (!tracksRes.ok) throw new Error(`top tracks: ${tracksRes.error}`);
  const tracks = tracksRes.data;
  console.log(`  → ${tracks.items?.length || 0} tracks`);

  const trackIds = (tracks.items || []).map(t => t.id).filter(Boolean);
  let audioFeatures = null;
  if (trackIds.length > 0) {
    console.log('[3] Fetching audio features...');
    const afRes = await getAudioFeatures(accessToken, trackIds);
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
      console.error('State mismatch — possible CSRF attack');
      process.exit(1);
    }

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>Authorization successful! You can close this tab.</h1>');
    server.close();

    console.log(`Got auth code. Exchanging for tokens...`);
    const tokenRes = await exchangeCode(code, CLIENT_SECRET);
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

  server.listen(PORT, () => {
    // keep alive until callback
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
