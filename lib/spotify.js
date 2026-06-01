/**
 * Spotify Web API client for Rounds Layer 3 (music profiling & cold-start).
 *
 * User-auth endpoints (requires OAuth 2.0 authorization code flow):
 *   - GET /v1/me/top/artists
 *   - GET /v1/me/top/tracks
 *
 * Public endpoints (client credentials or no auth):
 *   - GET /v1/search  (artists, tracks)
 *   - GET /v1/artists/{id}
 *   - GET /v1/artists/{id}/related-artists
 *
 * Cosine-similarity inputs:
 *   - genre vector from top-artists genres
 *   - track feature vector from top-tracks audio-features
 */

const CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID || '3834d7d7f4574316b902ccdc538921f2';
const REDIRECT_URI = process.env.EXPO_PUBLIC_SPOTIFY_REDIRECT_URI || 'http://localhost:3000';
const API_BASE = 'https://api.spotify.com/v1';
const AUTH_BASE = 'https://accounts.spotify.com';

// Scopes needed for Layer 3 profiling
const SCOPES = [
  'user-top-read',
  'user-read-private',
].join(' ');

/**
 * Build the Spotify authorization URL.
 * User opens this in browser, approves, gets redirected back with `?code=...`.
 * @param {string} state — CSRF nonce (store and verify on callback)
 * @returns {string}
 */
export function getAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    state,
  });
  return `${AUTH_BASE}/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access + refresh tokens.
 * @param {string} code
 * @param {string} clientSecret
 * @returns {Promise<{access_token:string, refresh_token:string, expires_in:number}|{error:string}>}
 */
export async function exchangeCode(code, clientSecret) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    client_secret: clientSecret,
  });
  const res = await fetch(`${AUTH_BASE}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const json = await res.json();
  if (!res.ok) {
    return { error: json.error_description || json.error || `HTTP ${res.status}` };
  }
  return json;
}

/**
 * Refresh an access token using the refresh token.
 * @param {string} refreshToken
 * @param {string} clientSecret
 * @returns {Promise<{access_token:string, expires_in:number}|{error:string}>}
 */
export async function refreshAccessToken(refreshToken, clientSecret) {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: CLIENT_ID,
    client_secret: clientSecret,
  });
  const res = await fetch(`${AUTH_BASE}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const json = await res.json();
  if (!res.ok) {
    return { error: json.error_description || json.error || `HTTP ${res.status}` };
  }
  return json;
}

async function spotifyGet(path, accessToken) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: json.error?.message || `HTTP ${res.status}` };
  }
  return { ok: true, data: json };
}

/**
 * Get user's top artists (long_term = ~1 year).
 * @param {string} accessToken
 * @param {number} limit — 1-50
 * @param {string} timeRange — short_term | medium_term | long_term
 */
export async function getTopArtists(accessToken, limit = 50, timeRange = 'long_term') {
  return spotifyGet(`/me/top/artists?limit=${limit}&time_range=${timeRange}`, accessToken);
}

/**
 * Get user's top tracks.
 * @param {string} accessToken
 * @param {number} limit — 1-50
 * @param {string} timeRange — short_term | medium_term | long_term
 */
export async function getTopTracks(accessToken, limit = 50, timeRange = 'long_term') {
  return spotifyGet(`/me/top/tracks?limit=${limit}&time_range=${timeRange}`, accessToken);
}

/**
 * Get audio features for a batch of track IDs (max 100).
 * @param {string} accessToken
 * @param {string[]} trackIds
 */
export async function getAudioFeatures(accessToken, trackIds) {
  const ids = trackIds.slice(0, 100).join(',');
  return spotifyGet(`/audio-features?ids=${ids}`, accessToken);
}

/**
 * Search for artists by name (useful for mapping RA lineup names to Spotify artist IDs).
 * @param {string} accessToken
 * @param {string} query
 * @param {number} limit
 */
export async function searchArtists(accessToken, query, limit = 5) {
  const q = encodeURIComponent(query);
  return spotifyGet(`/search?q=${q}&type=artist&limit=${limit}`, accessToken);
}

/**
 * Build a genre frequency vector from top artists.
 * @param {Array<{genres:string[]}>} artists
 * @returns {{vector:Record<string,number>, totalGenres:number}}
 */
export function buildGenreVector(artists) {
  const freq = {};
  let total = 0;
  for (const a of artists) {
    for (const g of a.genres || []) {
      freq[g] = (freq[g] || 0) + 1;
      total++;
    }
  }
  if (total > 0) {
    for (const k of Object.keys(freq)) {
      freq[k] = freq[k] / total;
    }
  }
  return { vector: freq, totalGenres: total };
}

/**
 * Build an average audio-feature vector from top tracks.
 * Features: danceability, energy, valence, tempo, acousticness, instrumentalness
 * @param {Array<object>} features — audio_features array
 * @returns {object|null}
 */
export function buildAudioFeatureVector(features) {
  if (!features || features.length === 0) return null;
  const keys = ['danceability', 'energy', 'valence', 'tempo', 'acousticness', 'instrumentalness'];
  const sum = {};
  let count = 0;
  for (const f of features) {
    if (!f) continue;
    count++;
    for (const k of keys) {
      sum[k] = (sum[k] || 0) + (f[k] ?? 0);
    }
  }
  if (count === 0) return null;
  const avg = {};
  for (const k of keys) {
    avg[k] = sum[k] / count;
  }
  return avg;
}

/**
 * Cosine similarity between two genre frequency vectors.
 * @param {Record<string,number>} a
 * @param {Record<string,number>} b
 * @returns {number} — -1 to 1
 */
export function cosineSimilarityGenre(a, b) {
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (const k of allKeys) {
    const av = a[k] || 0;
    const bv = b[k] || 0;
    dot += av * bv;
    magA += av * av;
    magB += bv * bv;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}
