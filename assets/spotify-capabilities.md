# Spotify Web API: Layer 3 Capabilities Audit

## Credentials
- Client ID: `3834d7d7f4574316b902ccdc538921f2`
- Client Secret: `5a9da5c45d254bd9862215354a4430d3`
- Redirect URI: `http://localhost:3000`

## What Works (Client Credentials — no user login)

| Endpoint | Status | Use for Layer 3 |
|---|---|---|
| `GET /v1/search?q={name}&type=artist` | ✅ | Map RA/Posh lineup names → Spotify artist IDs + genres |
| `GET /v1/artists/{id}` | ✅ | Fetch genres, popularity, images for a known artist |
| `GET /v1/search?q={name}&type=track` | ✅ | Find tracks (not needed for cold-start) |
| `GET /v1/tracks/{id}` | ✅ | Track metadata (not needed for cold-start) |

## What Fails (Client Credentials)

| Endpoint | Status | Likely Cause |
|---|---|---|
| `GET /v1/audio-features` | ❌ 403 | Extended quota not granted for new developer apps |
| `GET /v1/artists/{id}/related-artists` | ❌ 404 | Possibly restricted or artist not in graph |

## What Requires User Auth (Authorization Code Flow)

| Endpoint | Status | Use for Layer 3 |
|---|---|---|
| `GET /v1/me/top/artists` | Needs browser OAuth | Build user genre vector |
| `GET /v1/me/top/tracks` | Needs browser OAuth | Track IDs → audio features (if 403 resolved) |

## Layer 3 Pipeline (Genre-Only, Viable Today)

```
User side (requires OAuth once):
  Spotify /v1/me/top/artists → genre frequency vector

Event side (client credentials, no OAuth):
  RA/Posh lineup artist names
    → Spotify /v1/search?q={name}&type=artist
    → extract genres for each matched artist
    → aggregate into event genre frequency vector

Scoring:
  cosine_similarity(user_genre_vector, event_genre_vector)
  → ranked event recommendations
```

## Name-Matching Quality (Real Data)

From 25 artist searches across 6 NYC/Miami events:

| Quality | Count | Examples |
|---|---|---|
| Perfect match + genres | 9 | Ellen Allien, Loco Dice, Charlotte de Witte |
| Matched wrong artist | 4 | `ZAC` → Zach Bryan (country), `Mos (NYC)` → Mos Def (hip hop) |
| No genre data | 5 | Madam X, Star Eyes, Ms. Mada, Airrica, Diossa |
| No match at all | 4 | LPV (matched LPB Poody), DIFFER, Marco Neves, Patrick M |

**Match rate: ~36% perfect, ~64% noisy/missing**

### Mitigations
1. **Fuzzy search + popularity filter**: require `popularity > 20` to avoid obscure collisions
2. **Blacklist common collisions**: manually map known aliases
3. **Fallback to event-level genre tags**: when Spotify search fails, use RA's `genres` array directly
4. **Hybrid signal**: blend Spotify artist genres (when available) with RA event genres (always available)

## Cost
Spotify Web API: **free tier, 1000 requests/hour per app**. No monthly spend.

## Verdict
**Layer 3 is viable with genre-only cosine similarity.** Audio features are a nice-to-have but blocked by quota. The bigger problem is name disambiguation for underground DJs, which can be mitigated by hybrid RA+Spotify genre tagging.
