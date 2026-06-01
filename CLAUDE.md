# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm test                          # run all Jest tests
npx jest lib/__tests__/foo.test.js  # run a single test file
npx jest -t "test name pattern"   # run tests matching a name
npx expo start                    # start dev server (see dev server note below)
npx expo start --android          # Android only
npx expo start --ios              # iOS only
```

**Dev server:** The Expo dev server may already be running on `localhost:8081`. Do not run `npx expo start` again — it will conflict. Read Metro console output from the existing server or use `curl` against it. `expo export` and `expo-doctor` are safe to run alongside it.

## Architecture

### Stack

- **Expo SDK 54 + Expo Router** — file-based routing under `/app`
- **Firebase Auth, Firestore, Firebase Storage** — initialized in `lib/firebase.js` with `EXPO_PUBLIC_*` env vars
- **React contexts** — `AuthContext` (auth state + profile cache), `OnboardingContext` (multi-step onboarding state)

### Routing

Auth state drives initial navigation via `lib/auth-routing.js`:

```
loading → null
no user → /welcome
user + not onboarded → /onboarding/phone
user + onboarded → /(tabs)/friends
```

Tab order (defined in `lib/tab-config.js`): **Friends → Feed → Add (placeholder) → List → Profile**. `leaderboard` exists as a file but is in `HIDDEN_TAB_ROUTES` and should not be rebuilt until the Friends surface exists.

### Route ownership rules (from MISSION.md)

- `/compare` owns pairwise comparison
- `/venue/[id]` owns place metadata and report entry
- `/venue/[id]/rate` owns rating/post creation

### Data model

Current screens call Firestore directly (no backend worker yet). Client-owned collections: `posts`, `ratings`, `comparisons`, `users`, `reports`. Backend-reserved collections (do not write from client): `feedItems`, `leaderboardEntries`.

Venue data is static JSON from `assets/venues.json`, not a Firestore collection. City keys: `nyc`, `boston`, `chicago`, `sf`.

### Key domain terms

- **Cohort** — venue comparison category; must be consistent across venue lists, ratings, comparisons, and rankings. Values: `cocktail_bar`, `wine_bar`, `sports_bar`, `pub`, `night_club`, `dive_bar`.
- **Rating** — user's visit reaction (`loved`, `fine`, `disliked`); creating one also creates a `Post`.
- **Comparison** — pairwise decision between two venues in the same cohort; result is a winning venue id or `too-tough`.
- **Personal Ranking** — Elo-like local computation over comparisons in `lib/ranking.js` (DEFAULT_RATING=1500, K=16).
- **Friends** — planned hero surface for coordinating nights out; separate from follow graph.
- **Friendship** — mutual accepted relationship (stronger than following); created only on Friend Request acceptance.

Full vocabulary in `CONTEXT.md` and `GLOSSARY.md`.

### Lib modules

Pure domain logic lives in `/lib` and is tested without mocking Firebase:

| Module | Purpose |
|---|---|
| `auth-routing.js` | `resolveRoute` state machine |
| `auth-cache.js` | AsyncStorage wrapper for profile cache |
| `tab-config.js` | Tab order, icon helpers, hidden routes |
| `ranking.js` | Elo-like ranking over comparisons |
| `personal-rankings.js` | Cohort-scoped ranking with `getMyTopSpots` |
| `feed-display.js` | Feed query/sort helpers |
| `venue-display.js` | Venue metadata display helpers |
| `media-upload.js` | Firebase Storage upload helpers |
| `spotify.js` | Spotify genre vector capability |
| `besttime.js` | BestTime.app crowd data capability |
| `ticketsdata.js` | Event data capability |

### Testing pattern

Tests live in `lib/__tests__/`. They cover pure modules only — no screen rendering, no Firebase mocking. Use the Jest node environment. When adding logic, extract it into a `lib/` module first, then test the module.

## Current priorities

1. Make **Friends** the hero product surface (DMs, group chats, polls, review links, review companions)
2. Stabilize MVP flows: onboarding, auth routing, venue list/detail, rating/posting, feed, profile, comparison
3. Enforce cohort isolation everywhere ratings and comparisons interact
4. Move chat/feed/ranking logic into deeper `lib/` modules before adding new surface area

## Out of scope (do not build unless explicitly chosen)

- Rebuilding leaderboard/rank tab before Friends exists
- Production booking/reservation flows
- Geofenced real-time crowd reporting
- Server-side recommendation engine
- Native module authoring
- Revisiting Eventbrite/free event API ADR conclusions without new evidence
