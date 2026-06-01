# Mission: Rounds

## Why

Build Rounds into a nightlife-native mobile app: discover city venues, log visits, share activity, and turn cohort-scoped pairwise comparisons into personal rankings.

## Current state

- Expo SDK 54 app using Expo Router.
- Firebase Auth, Firestore, and Storage back the current prototype.
- Static venue seed covers NYC, Boston, Chicago, and San Francisco.
- Implemented flows: onboarding, login, venue list/detail, venue rating, feed posts, post detail comments/likes, profiles, people search, following, and `/compare` pairwise ranking.
- Placeholder/unfinished flows: leaderboard/rank projection, backend-owned feed, backend-owned ranking, geofenced crowd reports, bookings, event recommendations.

## Success looks like now

- Core MVP flows run reliably on device and web.
- Cohort isolation is enforced consistently for venue discovery, ratings, comparisons, and rankings.
- Ranking, feed, and social graph behavior are testable through deep modules, not duplicated inside screens.
- Firestore writes that create product state have clear ownership: client-owned MVP write or future backend-owned projection.
- Spotify/BestTime/TicketsData/event scraping stay available as capability modules but do not distract from stabilizing the MVP path.

## Constraints

- Keep route ownership clear: `/compare` owns pairwise comparison; venue detail owns place metadata and report entry; rating route owns rating/post creation.
- Current screens call Firestore directly; refactors should improve locality before adding new product features.
- Use official Expo docs before Expo changes. Current dependencies are SDK 54 even if future upgrade work targets a newer SDK.
- Prefer small tested modules around domain behavior before adding backend infrastructure.

## Out of scope unless explicitly chosen

- Production booking/reservation flows.
- Geofenced real-time crowd/queue reporting.
- Native module authoring.
- Production recommendation math beyond preserving current Spotify genre-vector capability.
