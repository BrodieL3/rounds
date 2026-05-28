# Research: Beli for Nightlife — Product & Technical Brief

## What We're Building

A **nightlife-focused social discovery and comparative ranking app** (bars, speakeasies, cocktail lounges, dance clubs) modeled on Beli's pairwise ranking mechanic, but re-engineered for the temporal, experiential nature of nightlife. Target: replace fragmented discovery (Google Maps, Yelp, Discotech) with a single app that is simultaneously a personal taste diary, real-time venue utility, and transactional booking hub.

---

## Beli: What Works

- **Pairwise ranking over absolute stars.** Users compare venues head-to-head rather than assigning arbitrary star ratings. Produces personalized 0–10 scores with high signal fidelity. Likely uses an Elo / Bradley-Terry / TrueSkill algorithm under the hood.
- **Social graph amplification.** Friend activity feed, tagging companions in check-ins, friend-adjusted scores alongside personal scores.
- **Gamification.** Streaks, city leaderboards, university challenges ("Dining Hall of Fame" across 187 schools). Drives retention.
- **Sentiment/metadata enrichment per entry.** Photos, dish callouts, contextual tags ("date night," "casual business"), written notes.
- **"Too tough" escape hatch.** If a comparison is too hard, user can skip and the new venue inherits the competitor's score. Prevents friction fatigue.

---

## Beli: What Breaks (and How to Fix It)

### 1. Category Conflation Problem
**Issue:** A single unified list forces illogical matchups — Michelin restaurant vs. dive bar.  
**Fix:** **Peer-cohort isolation.** Pairwise comparisons are strictly scoped within venue subcategories (dive bars vs. dive bars, cocktail lounges vs. cocktail lounges). Never cross-category.

### 2. Score Inflation / Linear Distribution
**Issue:** Beli uses a linear ordinal-to-score mapping. Power users with large lists end up with ~25% of venues scoring 9.0+, destroying the prestige of top scores.  
**Fix:** **Gaussian score distribution.** Lock the 9.0–10.0 tier behind a statistically small ceiling, preserving elite-score scarcity regardless of list size.

### 3. Cold-Start Problem
**Issue:** New users and users new to a city receive garbage recommendations until they've logged many reviews.  
**Fix:** **Spotify/Apple Music onboarding integration.** Parse the user's listening history on sign-up. Apply cosine similarity between their acoustic profile and venue music/artist lineups to generate confident recommendations before the user has rated anything.

### 4. Static Venue Scores
**Issue:** Nightlife venues are temporally variable — a lounge can be chill on Tuesday and packed on Friday.  
**Fix:** Multi-dimensional, time-aware profiles. Scores are supplemented with dynamic attributes: music genre, crowd demographics, peak hours, door policy, real-time line/cover data.

### 5. "Black Box" Recommendations
**Issue:** Users report the algo ignores strong negative signals (keeps recommending sushi to seafood-haters).  
**Fix:** Explicit negative-signal weighting in the recommendation engine. Consistently low-ranked subcategories in a user's history should suppress similar venues.

---

## Technical Architecture

### Venue Data & Peer-Cohort Seeding
- **Google Places API** — lat/long, hours, category baseline
- **Foursquare Places API** — rich categorical tagging; primary source for mapping venues into peer-cohort pools. Also provides top-liked review sentiment (auto-extracts keywords: "strong drinks," "friendly staff," "loud music")
- **Google Places Insights API** — walkability scores, nightlife density indexes → neighborhood vibe heatmaps

### Dynamic / Real-Time Event Layer
- **Resident Advisor GraphQL scraper** — live electronic music lineups, artist bios, subgenre tagging (techno, house, etc.) for underground/indie venues not covered by mainstream event APIs
- **Eventbrite API, Ticketmaster API, Dice.fm API** — mainstream event calendars, ticket sales
- **Spotify Web API** — user acoustic profile on onboarding; venue-to-profile cosine similarity for cold-start recommendations

### Real-Time Crowd & Queue Tracking
- **Geofenced crowdsourcing** — circular GPS geofences (50–150m radius) around partner venues. Only users physically on-site can submit queue length, cover charge, and crowd density reports.
- Queue-theory algorithms process raw inputs into estimated wait times.
- **Gamified incentive:** "VibeCoins" or platform loyalty tokens awarded for verified on-site submissions → drives continuous engagement loop.

### Transactional Booking Layer
- **Discotech B2B API** — verified table floorplans, bottle minimums, ticket sales, guest list sign-ups
- **Tablelist B2B API** — same; VIP table reservations with upfront pricing
- These bypass promoter friction entirely and create the core revenue model.

### Ranking Algorithm
- Elo-style update rule per pairwise comparison. Approximate 3–4 comparisons needed to place a new venue in the user's list.
- Peer-cohort isolation enforced at the DB query level — comparison candidates are filtered to matching venue type before surfacing to the user.
- Score mapping uses **Gaussian distribution**, not linear, to prevent top-tier inflation.

---

## Competitive Landscape

| App | Mechanism | Weakness |
|---|---|---|
| **Beli** | Private pairwise, personalized 0–10 | Category conflation, linear score bloat, cold-start |
| **Vota** | Public pairwise, crowdsourced leaderboards | No personalization, food-focused |
| **Yelp** | Absolute 1–5 stars | Known review filter manipulation, score noise |
| **Google Maps** | Absolute 1–5 stars | Extreme score inflation (everything 4.5–4.8) |
| **Discotech** | Event listing & booking | No discovery/ranking; purely transactional |

**Whitespace:** No product currently combines pairwise social ranking + real-time nightlife data + transactional booking in a single nightlife-native app.

---

## Product Priorities (Ordered)

1. **Peer-cohort-isolated pairwise ranking engine** — the core differentiator; must be correct before anything else.
2. **Spotify onboarding integration** — eliminates cold-start; first-session value is critical for retention.
3. **Geofenced real-time crowd reporting + VibeCoin incentives** — makes the app a live utility, not just a diary.
4. **Gaussian score distribution** — implement from day one; retrofitting later is painful.
5. **Transactional booking (Discotech/Tablelist)** — monetization layer; can be phased in post-launch.
6. **Social graph + friend activity feed** — retention and virality engine; mirrors Beli's strongest engagement mechanic.

---

## Key Schema Considerations

- Venues need a **`venue_type` enum** (dive bar, cocktail lounge, dance club, speakeasy, rooftop, sports bar, etc.) — this is the peer-cohort key.
- Ratings need **temporal metadata** (day of week, time of day) to power time-aware score overlays.
- User profiles need an **acoustic vector** (from Spotify) stored alongside their venue rating history.
- Crowd reports need **GPS-verified timestamps** and a **token ledger** for VibeCoin balances.
- Booking integrations are read/write via external B2B APIs — store reservation references, not floorplan data.
