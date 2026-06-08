# CLAUDE.md

Quick guidance for Claude Code (claude.ai/code) in this repository. This file is a secondary reference; start with `CONTEXT-MAP.md` for current source-of-truth docs and ADRs.

## Commands

```bash
npm test                            # run Jest tests
npm run test:rules                  # run Firestore rules emulator tests
npx jest lib/__tests__/foo.test.js  # run one Jest file
npx jest -t "test name pattern"     # run matching tests
npx expo export --platform web      # build/export web bundle
npx expo start                      # start dev server; see note below
npx expo start --android            # Android only
npx expo start --ios                # iOS only
```

**Dev server:** The Expo dev server may already be running on `localhost:8081`. Do not run `npx expo start` again if it is already active. Read Metro console output from the existing server or use `curl` against it. `expo export` and `expo-doctor` are safe to run alongside it.

## Architecture

### Stack

- **Expo SDK 54 + Expo Router** — file-based routing under `/app`
- **Firebase Auth, Firestore, Firebase Storage** — initialized in `lib/firebase.js` with `EXPO_PUBLIC_*` env vars
- **Firebase Functions v2** — trusted callable boundaries in `functions/` for group membership lifecycle
- **React contexts** — `AuthContext` (auth state + profile cache), `OnboardingContext` (multi-step onboarding state)

### Routing

Auth state drives initial navigation via `lib/auth-routing.js`:

```
loading → null
no user → /welcome
user + not onboarded → /onboarding/phone
user + onboarded → /(tabs)/friends
```

Current legacy tab route order (defined in `lib/tab-config.js`): **Friends → Discover (legacy `feed` route during migration) → Add/Plus → List → Profile**. `leaderboard` exists as a file but is hidden in `HIDDEN_TAB_ROUTES`; do not rebuild Rank/Leaderboard unless a future PRD explicitly selects it. Figma UI overhaul source of truth lives in `docs/agents/figma-ui-overhaul.md` and ADR 006.

### Route ownership rules

- `/compare` owns pairwise comparison
- `/venue/[id]` owns place metadata and report entry
- `/venue/[id]/rate` owns Rating creation and interim public projection creation
- `/conversation/[id]`, `/conversation/new`, and `/conversation/[id]/info` own DM/group chat UI flows; membership grants use service/function seams

### Figma UI overhaul note

Active target: rebuild frontend from Figma file `8CcbpAdt4AMYS9hulRy15n` using SDK 54/Expo Go-first. Discover replaces Feed in user-facing UI. Old auth/onboarding frontend can be removed for this UI pass; future auth plans are separate. Preserve Firebase/domain seams in `lib/**`, `functions/**`, and rules.

### Data model

Current screens still use Firestore directly in several places, with trusted callable Functions for group creation/lifecycle. Keep business rules in `lib/` services/helpers before wiring screens.

Core collections and direction:

- `ratings/{ratingId}` — canonical opinion/review object; see ADR 005
- `posts/{ratingId}` — interim public projection for public Ratings only; engagement lives here
- `reviews` — legacy read/migration data only; do not add new canonical behavior
- `comparisons` — user-owned pairwise decisions for Personal Ranking
- `friendRequests`, `friendships`, `conversations`, `users/{uid}/conversationStates`, `users/{uid}/notifications` — Friends/social planning state
- `feedItems`, `leaderboardEntries` — backend-reserved; do not write from client

Venue data is static JSON from `assets/venues.json`, not a Firestore collection. City keys: `nyc`, `boston`, `chicago`, `sf`.

### Key domain terms

- **Cohort** — venue comparison category; must stay consistent across venue lists, Ratings, Comparisons, and Personal Rankings. Values: `cocktail_bar`, `wine_bar`, `sports_bar`, `pub`, `night_club`, `dive_bar`.
- **Rating** — canonical visit-level opinion (`loved`, `fine`, `disliked`) with notes, media, visibility, and future companion tags.
- **Review** — user-facing word for a Rating; not a separate canonical object.
- **Post** — derived public projection of a public Rating; owns public engagement (`likes`, comments, bookmarks), not opinion identity.
- **Comparison** — pairwise decision between two venues in the same Cohort; result is a winning venue id or `too-tough`.
- **Personal Ranking** — Elo-like local computation over Comparisons in `lib/ranking.js`.
- **Friends** — hero planning surface for DMs, groups, links, polls, and companion context.
- **Friendship** — private accepted relationship, stronger than Follow, created only on Friend Request acceptance.

Full vocabulary lives in `CONTEXT.md`; load order lives in `CONTEXT-MAP.md`.

### Lib modules

Pure/domain logic should live in `/lib` and be tested before screen wiring.

| Module | Purpose |
|---|---|
| `auth-routing.js` | `resolveRoute` state machine |
| `auth-cache.js` | AsyncStorage wrapper for profile cache |
| `tab-config.js` | Tab order, icon helpers, hidden routes |
| `ranking.js` | Elo-like ranking over comparisons |
| `personal-rankings.js` | Cohort-scoped ranking with `getMyTopSpots` |
| `feed-display.js` | Legacy Feed / new Discover query/sort/display helpers |
| `venue-display.js` | Venue metadata display helpers |
| `media-upload.js` | Firebase Storage upload helpers |
| `friends/*` | Friend request, DM, group, inbox, and permission seams |
| `ratings/*` | Rating payload/projection helpers when implementing Rating canonicalization |
| `spotify.js` | Spotify genre vector capability |
| `besttime.js` | BestTime.app crowd data capability |
| `ticketsdata.js` | Event data capability |

### Testing pattern

Use TDD for feature work. Tests live primarily in `lib/__tests__/`; callable Function tests live in `functions/__tests__/`; Firestore rules tests run with `npm run test:rules`.

Pure helpers should avoid Firebase imports. Adapter/rules behavior belongs in emulator or focused integration tests. When adding logic, extract it into a `lib/` module first, test the module, then wire the route screen.

## Current priorities

1. Make **Friends** the hero product surface: DMs, group chats, polls, review links, review companions
2. Complete Rating canonicalization before building review links/unlisted shares
3. Stabilize MVP flows: onboarding, auth routing, venue list/detail, rating/posting, feed, profile, comparison
4. Enforce Cohort isolation everywhere Ratings and Comparisons interact
5. Move chat/feed/ranking/rating logic into deeper `lib/` modules before adding new surface area

## Out of scope unless explicitly chosen

- Rebuilding Leaderboard/Rank tab
- Production booking/reservation flows
- Geofenced real-time crowd reporting
- Server-side recommendation engine
- Native module authoring
- Revisiting Eventbrite/free event API ADR conclusions without new evidence
