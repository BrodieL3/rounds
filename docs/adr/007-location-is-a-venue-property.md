# ADR 007: Location is a property of the venue, not the user

- Status: Accepted
- Date: 2026-06-23
- Relates to: ADR 005 (Rating canonical opinion + public projection), ADR 006 (Figma Discover UI)

## Context

Discover tagged every Boston bar **"New York."** Root cause: location was modeled
as a single per-user `profile.city`, defaulted to `'nyc'` in code — but no
onboarding step ever sets a city (`OnboardingContext` seeds `city: ''`). That
phantom city was then:

1. **stamped onto every Rating** (`lib/ratings/rating-payloads.js` → `city: profile?.city || 'nyc'`), discarding the venue's real location;
2. used to **filter Discover** (`where('city', '==', userCity)`); and
3. used as the area **label** fallback (`CITIES[viewerCity]` → "New York") in `lib/feed-display.js`.

The same `profile?.city || 'nyc'` default silently **emptied** the Rate-a-place
search (`app/add.js`), the My List ranked area (`app/(tabs)/list.js`), and the
profile ranked list (`app/(tabs)/profile.js`), because `venues.json` has no `nyc`
key — those screens indexed `VENUE_DATA.cities['nyc']` and got `[]`.

Meanwhile the venue seed already carried the truth: all 238 venues are tagged with
a real `city` (`boston` | `cambridge`), `address`, and coordinates. The **data**
had migrated to a Boston + Cambridge beta; the **code** had not. A stale duplicated
`CITIES` map inside `feed-display.js` (missing `cambridge`) made the drift worse.

We want Beli's location model: a place has a fixed location; you can rank in any
city; your list is global; a *metro* is the discovery/leaderboard lens; the
"current area" follows device location.

## Decision

1. **Location belongs to the venue.** A Rating copies the venue's `city` at
   creation and derives `metro` from it (`CITY_TO_METRO`). We never stamp a city
   the user merely lives in. (`rating-payloads.js`)
2. **Metro is the lens.** `METROS` groups cities; the beta is the Boston metro
   (`['boston', 'cambridge']`). Cities keep **precise labels** ("Back Bay, Boston";
   "Inman Square, Cambridge"). Discovery/leaderboards scope by metro.
3. **Discover filters by `metro`, not the viewer's city** — two equality filters
   (`visibility`, `metro`), the same composite-index-free profile as before.
4. **Area labels derive from the post's own `city`/neighborhood, never the
   viewer's.** This kills the "New York" tag at the display layer.
5. **Beta scope = catalog, not model.** Limiting venues to Boston + Cambridge is a
   data constraint; re-adding a city is data-only (venues + a `CITIES` label + a
   `CITY_TO_METRO` entry).
6. **`profile.metro` defaults to `DEFAULT_METRO` ('boston')** until P1 wires device
   GPS (pure-GPS / Beli-exact, per product decision 2026-06-23).
7. **`CITIES` is single-source in `lib/constants.js`** and slimmed to
   `{ boston, cambridge }`. `feed-display.js` imports it instead of duplicating.

## Consequences

- New Ratings/Posts carry `city` (venue truth) + `metro`. **Legacy posts** stamped
  `city: 'nyc'` have no `metro` and won't appear under the Boston lens — they are
  beta test data. If any are worth keeping, the migration is a `venueId → seed.city`
  backfill (deferred to P1).
- **Pure-GPS edge:** a tester opening the app outside the metro sees an empty local
  lens (beta venues are Boston + Cambridge only). Accepted for the beta.
- `nyc / chicago / sf` labels retired from `CITIES` (no seed data). NYC neighborhood
  bounds remain in `venue-display.js` only because existing unit tests assert them;
  they are inert without NYC venues.
- `app/edit-profile.js` "home city" UI is deferred to the P1 GPS/lens layer.

## Out of scope (P1+)

Device-GPS current area, metro switching/filter UI, a global (cross-metro) My List
of the user's own ratings, recommendations curated to the local area, and
city/metro leaderboards (the Leaderboard tab stays hidden — see CLAUDE.md).
