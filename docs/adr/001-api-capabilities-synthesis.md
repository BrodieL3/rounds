# ADR 001: API Capabilities Synthesis — Layer 1-3 Prototype Findings

## Context

We are building a nightlife discovery app with four core layers. We have now prototyped Layers 1-3 using free or pay-as-you-go APIs to validate data availability and cost before committing to backend architecture.

This ADR synthesizes what each API returns, whether it fits the product use case defined in `research.md`, what is genuinely free, and how the data bolsters app functionality.

---

## Layer 1: Venue Discovery & Peer-Cohort Seeding

### API: Google Places API (New)

**What it returns**
- `displayName`, `formattedAddress`, `location` (lat/lng)
- `types`: `cocktail_bar`, `night_club`, `wine_bar`, `pub`, `bar`, `sports_bar`
- `rating`, `userRatingCount`, `priceLevel`
- `currentOpeningHours` (weekday text, `openNow` boolean)
- `photos` (up to 10 per venue)

**Fits use case?**
**Yes.** `research.md` explicitly calls for "Google Places API — lat/long, hours, category baseline." The `types` array maps directly to our peer-cohort isolation requirement (dive bar vs. cocktail lounge vs. dance club).

**Cost**
- Free tier: $200/month credit covers ~10,000 Place Details requests.
- Our scrape of 4 cities × 6 cohorts = ~300 venues, well within free limits.
- **Verdict: effectively free for prototype and early scale.**

**How it bolsters the app**
- Seeds the venue database with typed, geocoded, photo-rich records.
- Enables the core pairwise ranking mechanic by ensuring comparisons stay within cohort (`cocktail_bar` vs. `cocktail_bar`).
- Provides static metadata (price level, address, hours) for venue detail screens.

---

## Layer 2: Temporal Foot Traffic & Peak Hours

### API: BestTime.app

**What it returns**
- `busy_hours_list` (hourly 0-100 intensity for current day)
- `peak_hours` (start/end of peak window)
- `day_mean`, `day_max`, `day_rank_mean`, `day_rank_max`
- `venue_current_localtime`

**Fits use case?**
**Partially.** `research.md` states: "Multi-dimensional, time-aware profiles. Scores are supplemented with dynamic attributes: music genre, crowd demographics, peak hours." BestTime gives peak hours and relative busyness, but not real-time queue length or crowd density.

It solves the **"Static Venue Scores"** problem at the forecast level, but not the **"Real-Time Crowd & Queue Tracking"** requirement.

**Cost**
- Public key: free for `GET /forecasts/busy` (current day only).
- Private key: free tier seeds ~100 venue forecasts/month, then paid.
- **Verdict: free for lightweight current-day queries; seeding forecasts costs money at scale.**

**How it bolsters the app**
- Adds a temporal dimension to every venue card: "Peak at 11 PM tonight" or "Quiet before 9 PM."
- Powers time-aware ranking: a user's 9 PM comparison can weight busyness differently than their 1 AM comparison.
- Gives users a reason to open the app before going out (utility, not just diary).

---

## Layer 3A: User Music Taste (Acoustic Identity)

### API: Spotify Web API

**What it returns**

| Endpoint | Auth | Data | Status |
|---|---|---|---|
| `GET /v1/me/top/artists` | User OAuth | Artist names + **genre strings** (e.g. `melodic techno`, `deep house`) | ✅ Works |
| `GET /v1/me/top/tracks` | User OAuth | Track IDs, popularity, preview URLs | ✅ Works |
| `GET /v1/audio-features` | User OAuth | `danceability`, `energy`, `valence`, `tempo`, `acousticness` | ❌ **403 — blocked on new dev apps** |
| `GET /v1/search?q={name}&type=artist` | Client credentials | Artist ID + genres | ✅ Works |

**Fits use case?**
**Yes, with constraints.** `research.md` calls for "Spotify/Apple Music onboarding integration. Parse the user's listening history on sign-up. Apply cosine similarity between their acoustic profile and venue music/artist lineups."

We can build the **genre vector** (from `top/artists` and `search`). Audio features (the "acoustic vector") are blocked by quota restrictions for new developer accounts.

**Cost**
- Completely free. 1,000 requests/hour per app.
- **Verdict: zero monthly cost.**

**How it bolsters the app**
- Solves the **cold-start problem**: before a user has ranked a single venue, we know they like `techno` and `acid house`.
- Enables event-to-taste matching without user input.
- Search endpoint lets us resolve RA/Posh lineup names into genre data, bridging the user vector to the event vector.

---

## Layer 3B: Underground Electronic Events

### API: Apify `whatsup~ra-events-scraper` (Resident Advisor)

**What it returns**
- `title`, `description`, `startTime`, `endTime`
- `lineup`: array of artist name strings
- `genres`: array of `{id, name, slug}` (e.g. `techno`, `tech house`, `drum & bass`)
- `venue`: name, address, lat, lng
- `tickets`: price, currency, availability status
- `images`: flyer URLs
- `minAge`, `price` string

**Fits use case?**
**Yes.** `research.md` explicitly lists: "Resident Advisor GraphQL scraper — live electronic music lineups, artist bios, subgenre tagging." The data is richer than expected: genre tags, ticket prices, and venue geocoding are all present.

**Cost**
- ~$1.10 per city scrape on Apify PAYG.
- Daily refresh across 10 cities = **~$330/month**.
- Free plan hard limit exhausted after 5-6 test runs.
- **Verdict: NOT free at scale. Prototype-validated but economically blocked for a free/PAYG stack.**

**How it bolsters the app**
- Feeds the event discovery layer with underground electronic lineups.
- Genre tags + lineup names become the event-side vector for cosine similarity against the user's Spotify genre vector.
- Ticket prices and venue lat/lng enable map-based browsing and cost filtering.

---

## Layer 3C: Localized Non-Mainstream Parties

### API: Apify `hypebridge~posh-vip` (Posh.vip)

**What it returns**
- `eventTitle`, `description`, `startDateTime`, `endDateTime`
- `venueName`, `address`, `city`, `stateCode`, `coordinates` (lat/lng)
- `tickets`: name, price, availability, `isFree`
- `organizerName`, `organizerId`, `verified`
- `lineup`: often empty (Posh events are more promoter-driven)
- `attendingCount`, `guestlistEnabled`

**Fits use case?**
**Partially.** `research.md` does not mention Posh.vip specifically, but it does call for "non-mainstream localized party events." Posh fills the gap between RA (underground electronic) and Eventbrite (mainstream). It captures promoter-run warehouse parties, day parties, and community events.

However, the **lineup array is usually empty**, making Spotify genre mapping impossible for most Posh events. The genre signal must come from event description text parsing or organizer history.

**Cost**
- Same as RA: Apify PAYG, not free at scale.
- **Verdict: NOT free at scale. Complementary to RA but weaker genre signal.**

**How it bolsters the app**
- Expands event coverage beyond electronic music into hip-hop, reggaeton, and community-driven parties.
- Free/RSVP events surface budget-friendly options.
- Organizer verification and guestlist flags add social/trust signals.

---

## Cross-Layer Integration: Cosine Similarity Pipeline

With the free APIs alone (Google Places + BestTime + Spotify), we can build:

```
User signs up → Spotify OAuth
  → /v1/me/top/artists → user genre vector [techno: 0.3, house: 0.2, ...]

Venue/event data (from any source)
  → lineup artist names → Spotify search → artist genres
  → aggregate → event genre vector [techno: 0.5, tech house: 0.3, ...]

Scoring: cosine_similarity(user_vec, event_vec)
  → ranked event recommendations on onboarding screen
```

This directly implements the **"Spotify onboarding integration"** priority from `research.md`.

---

## What Is Free vs. What Costs Money

| Capability | API | Free? | Monthly Cost at Scale |
|---|---|---|---|
| Venue discovery + typing | Google Places | ✅ $200 credit | $0 (early) → usage-based |
| Foot traffic forecasts | BestTime | ⚠️ limited | $0 (public key) → $10-50/mo |
| User music taste vector | Spotify | ✅ fully | $0 |
| Event genre resolution | Spotify search | ✅ fully | $0 |
| Underground electronic events | Apify RA | ❌ | ~$330/mo (daily, 10 cities) |
| Localized parties | Apify Posh | ❌ | ~$200/mo (daily, 10 cities) |
| Real-time crowd reporting | Custom geofence | ❌ (build required) | Infra cost |
| Audio features (danceability, etc.) | Spotify | ❌ blocked | N/A |
| Transactional booking | Discotech/Tablelist | Untested | Unknown |

---

## Gaps & Blockers

1. **Real-time crowd data**: BestTime gives forecasts, not live queue lengths. The geofenced crowdsourcing layer from `research.md` requires custom backend + native permissions.
2. **Audio features**: Spotify returns 403 for `/audio-features`. Genre-only similarity is viable but coarser than the acoustic vector described in `research.md`.
3. **Underground events at scale**: Apify scrapers are too expensive for a free stack. Alternatives: self-hosted Puppeteer, Eventbrite API (free), Songkick API (free tier), or manual curator feeds.
4. **Name disambiguation**: Spotify search for underground DJs has ~36% perfect match rate. Collisions like `ZAC` → Zach Bryan (country) or `Mos (NYC)` → Mos Def (hip hop) pollute the event vector. Mitigation: popularity threshold + RA event genres as fallback.
5. **Transactional booking**: Discotech/Tablelist B2B APIs not tested. This is the monetization layer and lowest priority per `research.md`.

---

## Recommendation

**Proceed with Layers 1-3 using the free APIs.** The core cold-start mechanic (Spotify genre vector → event recommendation) is validated and costs $0. The temporal layer (BestTime) is validated and nearly free. The venue seeding (Google Places) is validated and effectively free.

**Defer Apify scrapers** until there is enough user demand to justify the cost, or until a cheaper event source (self-hosted scraper, Eventbrite API) is validated.

**Defer audio features** until Spotify grants extended quota or until genre-only similarity proves insufficient in user testing.
