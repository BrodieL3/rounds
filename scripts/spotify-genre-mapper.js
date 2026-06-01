/**
 * Layer 3: RA lineup → Spotify genre mapping prototype.
 *
 * Takes underground event lineup artist names, searches Spotify for each,
 * extracts genres, and builds an event-level genre frequency vector.
 *
 * This is the "venue/event vector" half of the cosine-similarity cold-start.
 * The user vector comes from Spotify /v1/me/top/artists (requires user auth).
 *
 * Run:
 *   node scripts/spotify-genre-mapper.js
 *
 * Uses client credentials (no browser login needed for this half).
 */
const fs = require('fs');
const path = require('path');

const CLIENT_ID = '3834d7d7f4574316b902ccdc538921f2';
const CLIENT_SECRET = '5a9da5c45d254bd9862215354a4430d3';
const AUTH_BASE = 'https://accounts.spotify.com';
const API_BASE = 'https://api.spotify.com/v1';

// Sample RA lineups from layer3-samples.json (NYC + Miami)
const SAMPLE_LINEUPS = [
  {
    event: "Ellen Allien All Night Long",
    venue: "public records",
    artists: ["Ellen Allien"],
  },
  {
    event: "AGAPĒ PRESENTS: Luke Slater + LPV",
    venue: "The Chocolate Factory",
    artists: ["Luke Slater", "LPV", "Annie Lew", "Diossa", "Marco Neves", "Mos (NYC)"],
  },
  {
    event: "Echo Chamber S1.E02: Madam X, Star Eyes, Edica",
    venue: "public records",
    artists: ["Madam X", "Star Eyes", "EDICA+"],
  },
  {
    event: "Loco Dice & Harvy Valencia",
    venue: "Club Space Miami",
    artists: ["Loco Dice", "Harvy Valencia", "Ms. Mada", "slugg"],
  },
  {
    event: "BLOND:ISH presents ABRACADABRA",
    venue: "Club Space Miami",
    artists: ["BLOND:ISH", "Antdot", "Vanjee", "Airrica", "Tiffy Vera", "AABEL"],
  },
  {
    event: "Hernan Cattaneo & ZAC",
    venue: "Club Space Miami",
    artists: ["Hernan Cattaneo", "ZAC", "Layla Benitez", "DIFFER", "Patrick M"],
  },
];

async function getClientToken() {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });
  const res = await fetch(`${AUTH_BASE}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error_description || json.error);
  return json.access_token;
}

async function searchArtist(token, query) {
  const q = encodeURIComponent(query);
  const res = await fetch(`${API_BASE}/search?q=${q}&type=artist&limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return null;
  const items = json.artists?.items || [];
  return items[0] || null;
}

function buildGenreVector(artistGenresList) {
  const freq = {};
  let total = 0;
  for (const genres of artistGenresList) {
    for (const g of genres) {
      freq[g] = (freq[g] || 0) + 1;
      total++;
    }
  }
  if (total > 0) {
    for (const k of Object.keys(freq)) freq[k] = freq[k] / total;
  }
  return { vector: freq, total };
}

function cosineSimilarity(a, b) {
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let dot = 0, magA = 0, magB = 0;
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

async function main() {
  console.log('=== Spotify Genre Mapper (Layer 3) ===\n');
  const token = await getClientToken();
  console.log('Client token acquired\n');

  const eventVectors = [];

  for (const event of SAMPLE_LINEUPS) {
    console.log(`Event: ${event.event}`);
    console.log(`Venue: ${event.venue}`);

    const artistResults = [];
    for (const name of event.artists) {
      // Clean name: strip parenthetical disambiguators
      const cleanName = name.replace(/\s*\([^)]*\)\s*$/, '').trim();
      const artist = await searchArtist(token, cleanName);
      if (artist) {
        artistResults.push({
          query: name,
          matched: artist.name,
          genres: artist.genres || [],
          popularity: artist.popularity,
        });
      } else {
        artistResults.push({ query: name, matched: null, genres: [], popularity: null });
      }
      // Polite delay
      await new Promise(r => setTimeout(r, 120));
    }

    const matched = artistResults.filter(r => r.matched);
    const missed = artistResults.filter(r => !r.matched);
    const allGenres = matched.map(r => r.genres);
    const eventVec = buildGenreVector(allGenres);

    console.log(`  Artists: ${event.artists.length}, matched: ${matched.length}, missed: ${missed.length}`);
    for (const r of artistResults) {
      const g = r.genres.length > 0 ? ` → ${r.genres.join(', ')}` : ' → (no match)';
      console.log(`    ${r.query}${r.matched && r.matched !== r.query ? ` [matched: ${r.matched}]` : ''}${g}`);
    }
    console.log(`  Event genre vector (${eventVec.total} tags):`);
    const top = Object.entries(eventVec.vector).sort((a, b) => b[1] - a[1]).slice(0, 5);
    for (const [g, s] of top) {
      console.log(`    ${g}: ${(s * 100).toFixed(1)}%`);
    }
    console.log('');

    eventVectors.push({
      event: event.event,
      venue: event.venue,
      artists: artistResults,
      genreVector: eventVec.vector,
    });
  }

  // Build a fake user vector for demo similarity scoring
  const userGenres = [
    ['techno', 'acid techno', 'hard techno'],
    ['techno', 'minimal techno'],
    ['tech house', 'techno'],
    ['techno', 'industrial'],
    ['techno', 'electro'],
  ];
  const userVec = buildGenreVector(userGenres);

  console.log('=== Demo: Cosine similarity vs synthetic user vector ===');
  console.log(`User genres: ${Object.keys(userVec.vector).join(', ')}\n`);

  const scored = eventVectors.map(ev => ({
    ...ev,
    score: cosineSimilarity(ev.genreVector, userVec.vector),
  })).sort((a, b) => b.score - a.score);

  for (const ev of scored) {
    console.log(`[${(ev.score * 100).toFixed(1)}%] ${ev.event} @ ${ev.venue}`);
  }

  const output = {
    timestamp: new Date().toISOString(),
    events: eventVectors,
    demoUserVector: userVec.vector,
    demoRankings: scored.map(s => ({
      event: s.event,
      venue: s.venue,
      score: s.score,
    })),
  };

  const outPath = path.join(__dirname, '..', 'assets', 'spotify-genre-mapping.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nWrote ${outPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
