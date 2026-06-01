# Rounds Glossary

Canonical domain language lives in `CONTEXT.md`. This file is quick lookup.

## Product terms

- **Venue** — nightlife place users discover, rate, post about, and compare.
- **City** — market-scoped venue pool (`nyc`, `boston`, `chicago`, `sf`).
- **Cohort** — peer-comparison category (`cocktail_bar`, `wine_bar`, `sports_bar`, `pub`, `night_club`, `dive_bar`).
- **Rating** — user visit reaction: `loved`, `fine`, or `disliked`, plus optional notes/photos.
- **Post** — public feed item created from a Rating.
- **Comparison** — pairwise decision between two venues in same Cohort.
- **Too Tough** — Comparison result meaning user cannot choose; ignored by current ranking computation.
- **Personal Ranking** — user-specific ordered venue list computed from Comparisons.
- **Feed** — city activity stream with followed users promoted above other local activity.
- **Follow Graph** — followers/following arrays on user profiles.
- **Spotify Genre Vector** — normalized genre-frequency map from Spotify top artists.
- **Event Recommendation** — future match between user Spotify Genre Vector and event/lineup genre data.
- **Crowd Report** — future geofenced live signal for queue, crowd, cover, or door conditions.
- **Leaderboard Entry** — future backend-owned city/cohort ranking projection.

## Architecture terms

- **Client-owned MVP write** — direct Firestore write from Expo app used by current prototype.
- **Backend-owned projection** — derived data that should be written by trusted backend code, not client screens.
- **Route ownership** — rule that one route owns each primary user action. `/compare` owns pairwise ranking.
- **Venue seed** — static `assets/venues.json` dataset used until venues become canonical backend data.
