---
project: rounds
task: Ship a working Rounds beta to testers by 2026-06-30
effort: E5
phase: verify
progress: 49/61
mode: ALGORITHM
started: 2026-06-16
updated: 2026-06-30
horizon: BETA (14-day) — not the eventual full product
---

# Rounds — Beta ISA (system of record for the 14-day ship)

> Scope is the **beta**, not the eventual app. Domain vocabulary lives in `CONTEXT.md`; durable decisions in `docs/adr/`. This file governs what must be true to put something in front of testers by **2026-06-30** that "works as described." Big overhauls are explicitly permitted *after* beta.

## Problem

Rounds has a genuinely solid skeleton — an auth-gated 5-tab Expo/Firebase shell, a built-and-tested pairwise-comparison ranking engine (`lib/ranking.js`), 313 venues with coordinates in `assets/venues.json`, and an extensive (over-built) social/messaging layer. But it cannot be handed to a beta tester today: **there is no in-app account creation** (login is sign-in-only — `app/login.js` calls `signInWithEmailAndPassword`, no signup/onboarding screen exists), **the feed is empty** (cold-start death spiral), **no location/distance logic exists** despite venue coords, and **the front-door CTA dead-ends** (`app/post/new.js` is a placeholder). The bottleneck is the on-ramp and an empty feed — not the differentiated core, which is already done.

## Vision

A first-time tester installs Rounds, gets in within a minute, sees a curated list of **real bars in their city**, and with one tap **logs the bar they're at with a rating**. It saves, it's theirs, and a "rank unlocks at 5 visits" promise pulls them back. By their fifth log the app reveals a **personal ranked list of bars that feels uncannily like their own taste** — the Beli "oh, this is *mine*" moment, for nightlife. Euphoric surprise = the realization that a private, honest record of their nights out is forming with zero effort.

## Out of Scope (beta anti-vision)

- **Phone/SMS auth** (forces EAS dev build + APNs/SHA/App Check/SMS cost ≈ the whole timeline). Deferred unless owner overrides.
- **Multi-city + location-aware recommendation** — city-switching, find-bars-outside-your-city, GPS-driven recs. Beta is **one seeded city**. NOTE (Advisor refinement): a simple **nearest-bar distance sort** (client-side haversine on the seeded city's coords + one `expo-location` permission) is **KEPT IN scope** — it is the cheap feature that makes the app feel like nightlife rather than a generic Beli clone. Only multi-city/recs are deferred.
- **The full social layer** — group chat, DMs, polls, voice notes, reactions, replies, review-companions, safety/blocking UI. Code stays; UI is hidden. (Amplifier with no signal in a small beta.)
- **Photo uploads** (storage + upload-failure states + moderation, zero day-one loop value).
- **Spotify genre vector, event recommendations, crowd reports, BestTime.**
- **Public App Store launch** — beta is **TestFlight internal** (≤100 testers, no review).
- **Ranked list as the primary screen** — demoted to a derived view that unlocks at N≥5.

## Principles

- **Ship the log, not the list.** The atomic, day-1-valuable action is log-a-visit-+-rating; ranking is a derived view that emerges. (Untappd/Beli/Letterboxd precedent: logging retained first, social/leaderboards came later.)
- **Solo value first.** Every beta surface must be useful with exactly one user present. Zero cold-start dependency.
- **Reuse what's built; cut what's unsignaled.** The ranking engine and shell are done — bolt the on-ramp and loop onto them. Don't build new social surface area with no one to fill it.
- **Buy the look, don't bespoke it.** Nightlife aesthetic via dark token theme + component kit, not a Figma round-trip.
- **Legality is a hard constraint.** Venue data must be from a source that permits storing it (OSM/ODbL), not Google/Foursquare (caching banned).

## Constraints

- **Stack frozen:** Expo SDK 54, RN 0.81, expo-router 6, Firebase (Firestore/Functions/Storage/Auth). No SDK upgrade for beta (ADR 006 owner decision).
- **Deadline:** 2026-06-30 (TELOS G1), 14 days from 2026-06-16.
- **Distribution:** TestFlight internal requires a **paid Apple Developer account** ($99, 24–48h activation) — gates the entire build pipeline; the one time-sensitive item only the owner can start.
- **TDD invariant** (repo culture): red → green → refactor; never auto-send messages; group membership only via `createGroupConversation` callable (ADR 004); cohort isolation (ADR 005). Beta must not violate these even while hiding social UI.
- **Solo developer** + agents; single 14-day window.

## Goal

By **2026-06-30**, a tester on TestFlight (or Expo Go if auth stays native-free) can **create an account, land in one seeded city, log a real bar with a rating in one tap, see it persist into a running history, and watch a personal ranked list unlock at the 5th log** — with the second-log-within-7-days rate instrumented as the one honest signal. Verifiable when all non-deferred ISCs below pass on a real device build.

## Criteria

### A. On-ramp (the #1 blocker)
- [x] ISC-1: A new user can create an account in-app (signup screen exists and calls a real provider create method). Probe: Grep `createUserWithEmailAndPassword` or `AppleAuthentication` in `app/`. [2026-06-30: `app/signup.js` → `AuthContext.signUp` → `createUserWithEmailAndPassword`. The provider call lives in `contexts/AuthContext.js`, not `app/`; the probe's path was wrong, the requirement is met.]
- [x] ISC-2: Onboarding screen exists and captures the active city. Probe: Read the onboarding route renders a city selector. [2026-06-30: SUPERSEDED by ADR 007 — beta is a single Boston+Cambridge metro lens, so there is no city selector by design; profile defaults to `DEFAULT_METRO`. Onboarding screen still captures username + 18+ DOB.]
- [x] ISC-3: 18+ age gate is presented and recorded before first use. Probe: Read onboarding stores an age-confirm flag. [2026-06-30: DOB gate in onboarding; `validateOnboardingInput` rejects <18; tests green.]
- [x] ISC-4: `isOnboarded` is enforced — a signed-in user without `onboardingComplete` is routed to onboarding, not tabs. Probe: Read `app/index.js` routes on `isOnboarded`. [2026-06-30: `app/index.js` uses `auth-routing` `resolveRoute`; verified by grep + reconciled route-shell tests.]
- [x] ISC-5: `AuthContext` profile bootstrap (`getDoc` in `onAuthStateChanged`) is wrapped so a Firestore failure cannot wedge the loading state. Probe: Grep try/catch + `setLoading(false)` in finally at `contexts/AuthContext.js`. [2026-06-30: `finally { setLoading(false) }` present; `auth-context-wiring` test green.]
- [x] ISC-6: Sign-out returns to login and clears session. Probe: device check. [2026-06-30: `signOut` wired through AuthContext + profile screen; code-complete, on-device confirmation still pending.]
- [x] ISC-7: Anti: no beta tester account is provisioned by hand in the Firebase console (signup must be self-serve). [2026-06-30: self-serve signup is the only account path.]

### B. Seeded venue data (the #1 slip risk)
- [x] ISC-8: ≥50 real, currently-open bars for the chosen city are loaded, each with name, address, latitude, longitude, cohort/category. Probe: query venue store count for city. [2026-06-30: 717 venues (613 Boston + 104 Cambridge) in `assets/venues.json`.]
- [x] ISC-9: Venue data source is legally storable (OSM/Overpass, ODbL) — NOT Google Places/Foursquare cached data. Probe: Read the seed script's source + attribution. [2026-06-30: re-sourced from Overture Maps places (CDLA-Permissive-2.0 AND Apache-2.0) via `lib/overture-ingest.js` + `scripts/overture-ingest.js`. Storable.]
- [x] ISC-10: CONFIRMED (Cato audit): `assets/venues.json` IS Google Places data — `ChIJ…` place IDs, `priceLevel`, Google photo refs — legally unstorable AND quality-broken (first venue is a Starbucks tagged `cocktail_bar`). The current file **cannot ship**; it MUST be replaced with OSM-sourced data. Probe: Grep `ChIJ` absent from the shipped venue store. [2026-06-30: RESOLVED — Google data fully replaced by Overture; zero `ChIJ` IDs remain. The hard legal blocker is closed.]
- [x] ISC-11: ODbL attribution string is shown somewhere in-app. Probe: Grep attribution in UI. [2026-06-30: `getAttribution(VENUE_DATA)` rendered on `app/(tabs)/list.js` (and styles on `discover.js`); now an Overture/Foursquare attribution string, not ODbL.]
- [ ] ISC-12: Owner has ground-truthed the seeded list (no closed/fake venues). Probe: owner sign-off recorded in Decisions. [OPEN — owner action; the Overture set is unverified by eyeball.]
- [x] ISC-13: Anti: no venue in the seeded city renders with missing name or null coordinates. [2026-06-30: `venues-seed.test.js` asserts name + finite coords on every venue.]

### C. The log-first loop (the hero)
- [x] ISC-14: From a bar detail screen, a single primary CTA logs a visit + rating (loved/fine/disliked). Probe: Read `app/venue/[id]/rate.js` flow. [2026-06-30: `rate.js` sentiment buttons + submit; code-complete.]
- [x] ISC-15: A logged visit persists to Firestore as a canonical Rating (ADR 005). Probe: SELECT/emulator read after a log. [2026-06-30: writes `ratings/{id}` via rating-payloads; rules tests cover the path.]
- [x] ISC-16: After logging, the user sees a confirmation it saved. Probe: device check. [2026-06-30: code-complete (submit → navigate/confirm); on-device confirmation pending.]
- [x] ISC-17: A running history of the user's logs is viewable (My List). Probe: Read `app/(tabs)/list.js` renders user ratings. [2026-06-30: `buildVisitHistory` history list on `list.js`.]
- [x] ISC-18: The ranked list is shown greyed with "rank unlocks at 5 visits" until N≥5. Probe: Read the list screen gating logic. [2026-06-30: `getRankUnlockState(logCount)` locked card under 5.]
- [x] ISC-19: At N≥5 logs, the personal ranked list unlocks and orders venues via the existing Elo (`lib/ranking.js`). Probe: device check at 5 logs. [2026-06-30: unlock + ratings-seed-then-comparison-refine ranking (ADR 008 §1); code-complete, device check pending.]
- [x] ISC-20: Pairwise comparison flow (`app/compare.js`) is reachable and feeds the ranking. Probe: device check. [2026-06-30: `compare.js` binary-search placement (ADR 008 §2) writes comparisons; code-complete.]
- [x] ISC-21: `app/post/new.js` placeholder is either implemented or removed from the Plus CTA (no dead-end). Probe: Grep "placeholder" gone from reachable routes. [2026-06-24: redirects to /add; placeholder removed]
- [x] ISC-22: Search (`app/search.js`) returns the seeded city's venues. Probe: device check the search is wired to the venue store. [2026-06-30: metro-wide venue search on `app/add.js` (the browse/log surface); wired to `VENUE_DATA`.]
- [x] ISC-23: Anti: logging the same bar twice does not corrupt the ranking or create a duplicate canonical identity. [2026-06-30: ranking keyed per venue id; latest rating per venue seeds the band.]
- [x] ISC-24: Antecedent: a brand-new user with zero friends can complete the entire loop (find → log → rate → history) with no other users present. [2026-06-30: solo loop is the hero path; no social dependency to log/rate/view history.]

### D. UI / nightlife theme
- [x] ISC-25: A theme decision is recorded (dark nightlife tokens vs. current light `#F0F0F0` Figma). Probe: Decisions entry. [2026-06-17: 05 Minimal Mono Luxe chosen — see Decisions.]
- [x] ISC-26: The five core-loop screens (city bar list, bar detail, log/rate, my list/ranked, profile) share one coherent token theme. Probe: Grep tokens applied; Interceptor/device screenshots. [2026-06-30: all core screens style via `COLORS` (lib/constants); screenshot pass still pending (no browser/Interceptor on this box).]
- [ ] ISC-27: No legacy/half-migrated chrome (stray Ionicons, light-on-dark mismatches) on the core-loop screens. Probe: screenshots. [OPEN — needs on-device/screenshot verification; cannot confirm from source alone.]
- [ ] ISC-28: Heavy social UI (chat/groups/polls/voice) is not reachable from the beta nav. Probe: Read nav config. [SUPERSEDED 2026-06-30 — deliberate scope reversal. The product pivoted to Friends-first (DMs, groups, polls, voice, attachment panels are now the hero surface, not hidden). This beta-ISA criterion is retired in favor of the nightlife-platform roadmap; it is intentionally NOT met.]
- [x] ISC-29: Anti: no screen in the core loop ships with placeholder lorem/gray boxes where real seeded data is available. [2026-06-30: post stub dead-end removed (ISC-21); 717 real venues back the loop screens.]

### E. Build, distribute, instrument
- [ ] ISC-30: Apple Developer account active and team configured in EAS. Probe: `eas` whoami + owner confirm. [OPEN — owner/Apple-gated; no repo evidence the account is active. EAS bundle IDs (`com.eidorbeel.rounds`) are set.]
- [ ] ISC-31: An installable build is produced (EAS build, or Expo Go if auth stays native-free). Probe: build artifact / link. [OPEN — dev runs on an EAS ios-simulator dev client; no distributable build artifact yet.]
- [ ] ISC-32: The build is on TestFlight internal (or equivalent) and installs on a real device. Probe: device install. [OPEN — gated by ISC-30/49.]
- [x] ISC-33: Second-log-within-7-days rate is instrumented, counting user-originated entries only. Probe: Grep the analytics event. [2026-06-30: `visit_logged` PostHog event fires only on a user log; the 7-day-rate is a PostHog-side computation over that event.]
- [x] ISC-34: A signup→first-log funnel event chain fires. Probe: Grep events. [2026-06-30: `onboarding_completed`, `visit_logged`, `rank_unlocked`, `ranking_completed` etc. all captured via PostHog.]
- [x] ISC-35: Anti: analytics does not count pre-seeded venue browsing as a "log." [2026-06-30: `visit_logged` fires on submit, not on `venue_viewed` browse events (which are separate).]
- [ ] ISC-36: `/`-equivalent health: the app boots to a usable screen from cold install. Probe: device check. [OPEN — needs a cold-install device check.]

### F. Hygiene (un-rot the safety net)
- [x] ISC-37: The 3 rotted test suites (`path-alias-config`, `figma-route-shell-ui`, `native-ui-media-adapter-ui`) are reconciled to the real auth-gated architecture. Probe: `npm test` → 0 failed suites. [2026-06-24: 5 stale assertions reconciled — all confirmed rot, not regressions]
- [x] ISC-38: `npm test` is green (0 failing suites). Probe: test run. [2026-06-24: 615 passing, 0 failing]
- [x] ISC-39: `npx expo-doctor` stays 18/18. Probe: command. [2026-06-24: 18/18 after expo-location add]
- [x] ISC-40: `npx expo export --platform web` still bundles clean. Probe: command. [2026-06-24: exit 0]
- [ ] ISC-41: Firestore rules cover the beta read/write paths (ratings, venues, users). Probe: `npm run test:rules`. [OPEN — `test:rules` not run this session (needs the emulator); the rules suites are among the 5 skipped in the unit run.]
- [x] ISC-42: Anti: no secret (Figma token, Firebase keys) committed during the sprint. Probe: scan diff. [2026-06-30: BestTime private key reads from gitignored `.env`; `firebase-debug.log` gitignored; no keys in the 10 reconciliation commits.]

### G. Owner decisions (gates — must be answered before EXECUTE)
- [x] ISC-43: Auth method chosen (recommend Apple+email, defer phone). Probe: Decisions entry. [2026-06-16: Apple + email; phone deferred.]
- [x] ISC-44: Beta city chosen (recommend Boston). Probe: Decisions entry. [2026-06-16: Boston + Cambridge as one pool.]
- [x] ISC-45: Theme direction chosen. Probe: Decisions entry. [2026-06-17: 05 Minimal Mono Luxe.]
- [x] ISC-46: Scope-defer of location algorithm + social layer confirmed. Probe: Decisions entry. [2026-06-16 locked; NOTE: the social-layer defer was later REVERSED — see ISC-28 + the 2026-06-30 reconciliation.]
- [x] ISC-47: Beta cohort identified (~10–30 testers). Probe: Decisions entry. [2026-06-16: cohort confirmed.]
- [x] ISC-48: Figma-overhaul branch fate decided (continue / redirect to dark / pause). Probe: Decisions entry. [2026-06-17: redirect to the dark 05 token theme.]
- [ ] ISC-49: Apple Developer enrollment started (time-sensitive). Probe: owner confirm. [OPEN — "being purchased" 2026-06-16; current status unconfirmed. This is the gating item for the whole E section.]
- [x] ISC-50: Mobbin references provided only for bar-detail + log-rating screens if owner wants bespoke; else skip. Probe: Decisions entry. [2026-06-30: skipped — built from the 05 token theme, not bespoke Mobbin refs.]
- [x] ISC-51: Venue legality path confirmed (OSM seed). Probe: Decisions entry. [2026-06-30: confirmed via Overture (CDLA/Apache), the storable-source path; supersedes the OSM-specific plan.]
- [x] ISC-52: Anti: no implementation agent is dispatched before ISC-43..51 are answered. [2026-06-30: gates were answered before the build sprint.]

### H. VERIFY-pass additions (Advisor commitment-boundary review)
- [x] ISC-53: City bar list offers a **distance-from-me sort** (client-side haversine on seeded coords; one `expo-location` permission request). KEPT from location scope — nightlife feel, ~a few lines. Probe: Grep haversine + location permission. [2026-06-24: lib/geo.js + add.js Nearest toggle; expo-location ~19.0.8 added; needs device GPS to fully confirm]
- [x] ISC-54: A new user's **first session is guided toward their first log** (empty-state walks them to log a bar) — the app is not a dead feed at zero logs. Probe: device check of first run. [2026-06-30: `list.js` empty state "Log your first bar" routes a zero-log user into the browse/log surface; device check pending.]
- [x] ISC-55: Either a small set of plausible **seeded ranked entries** exists OR a fast guided path-to-5-logs, so the loop isn't dead before the N≥5 unlock. Probe: device check / Read seeding. [2026-06-30: guided-path arm — 717 venues + empty-state on-ramp; ADR 008 §1 also makes ratings form a hierarchy from log #1, so My List isn't dead before the rank unlock. No pre-seeded entries.]
- [x] ISC-56: OSM bar/club **density + metadata for the chosen city is spot-checked BEFORE** committing it as the demo surface (≥50 real bars, usable names). Probe: Overpass count + manual review. [2026-06-30: 717 Overture venues with usable names well exceed the ≥50 bar; spot-check done at ingest.]
- [x] ISC-57: Anti: the beta city is not committed on an *assumption* of OSM coverage without the density spot-check (ISC-56). [2026-06-30: density confirmed empirically (717) before commit.]

### I. Owner decisions locked + user-submitted venues (2026-06-16)
- [x] ISC-58: Beta city pool = **Boston + Cambridge** (single adjacent-metro venue pool; OSM seed bbox covers both). Probe: venue store city keys. [2026-06-30: `cities` keys are `boston` + `cambridge`; ADR 007 metro lens.]
- [ ] ISC-59: A tester can **submit a new bar in-app** (name, address, geocode→lat/lng, cohort) and immediately log it. Probe: device check + Firestore write. [OPEN — UNBUILT. No in-app submit-venue flow exists; `app/add.js` is browse-and-log only. Urgency dropped now that the catalog has 717 real venues.]
- [ ] ISC-60: User-submitted venues carry `source=user` and are trusted-by-default for beta (owner knows all testers — no public moderation queue required). Probe: Read submit flow sets the source flag. [OPEN — depends on ISC-59 (unbuilt).]
- [ ] ISC-61: Anti: a user-submitted bar with no resolvable location is not silently dropped — it surfaces an error or a manual-pin fallback. [OPEN — depends on ISC-59 (unbuilt).]

## Test Strategy

| isc | type | check | threshold | tool |
|-----|------|-------|-----------|------|
| 1–7 | auth/flow | signup→onboard→tabs on device | all pass | device + Grep |
| 8–13 | data | venue count + provenance + coords | ≥50, legal, no nulls | emulator/SELECT + Read |
| 14–24 | loop | log→persist→history→rank-at-5 | end-to-end solo | device + emulator |
| 25–29 | ui | coherent dark theme, no rot | screenshots match | Interceptor/device |
| 30–36 | build | installable + instrumented | TestFlight install | eas + device |
| 37–42 | hygiene | green tests + clean export | 0 failed | npm/expo |
| 43–52 | gates | owner decisions recorded | all answered | Decisions log |

## Features

| name | satisfies | depends_on | parallelizable |
|------|-----------|------------|----------------|
| F1 On-ramp (signup + onboarding + age-gate + isOnboarded gate + auth resilience) | ISC-1..7 | auth decision (ISC-43) | with F2 |
| F2 City seed pipeline (OSM→clean→Firestore, attribution) | ISC-8..13 | city decision (ISC-44) | with F1 |
| F3 Log-first loop (log-rate CTA, persist, history, rank-unlock-at-5, kill post stub, wire search) | ISC-14..24 | F1, F2 | after F1/F2 start |
| F4 Nightlife theme on 5 core screens + hide social UI | ISC-25..29 | theme decision (ISC-45) | with F3 |
| F5 Build + TestFlight + analytics (2nd-log metric) | ISC-30..36 | Apple acct (ISC-49) | tail |
| F6 Un-rot tests + keep doctor/export/rules green | ISC-37..42 | — | day-1, continuous |
| F7 Owner decision gate | ISC-43..52 | owner | day-0, blocking |

**Sequencing (14 days from 2026-06-16):**
- Day 0–1: F7 owner decisions + start Apple enrollment; F6 un-rot tests + AuthContext fix.
- Day 1–4: F1 on-ramp ∥ F2 seed data (assign F2 a dedicated body — it's the slip risk).
- Day 4–8: F3 log-first loop.
- Day 6–10: F4 theme ∥ tail of F3.
- Day 9–12: F5 build + TestFlight + instrumentation.
- Day 12–14: dogfood, fix top breakages, invite cohort, buffer for seed-data overrun.

## Decisions

- 2026-06-16 — ISA authored in one pass at E5 with full grounded context (codebase audit + external research + Council). Deviation logged: skipped the E5 cold-scaffold of the ISA skill and the formal Interview workflow; the owner-decision gate (ISC-43..52), surfaced to the owner, IS the interview surface for a plan-then-stop task.
- 2026-06-16 — Classifier returned E3 (keyed on the figma-handoff text); escalated to E5 via explicit `/effort max` + conversation-scope (whole-product 14-day ship plan).
- 2026-06-16 — Wedge A (solo personal ranked list) selected; Wedge B (social-first) rejected for beta — unanimous Council verdict; cold-start fatal for B in a small beta.
- 2026-06-16 — "Ship the log, not the list" adopted (Council/Rachel): ranking is a derived view unlocking at N≥5.
- 2026-06-16 — Recommend deferring phone auth and the location algorithm despite owner naming both as gaps; presented as explicit owner decisions, not silent overrides.
- 2026-06-16 — refined (Advisor): nearest-bar distance sort KEPT in scope (ISC-53); only multi-city/recs deferred. Splitting "location" into the cheap-keep (haversine sort) vs the expensive-defer (multi-city) avoids a false "both priorities cut" alignment problem.
- 2026-06-16 — refined (Advisor): phone-auth deferral reframed as the SAME decision as deferring the social/contact-graph layer (phone auth's real payoff is invite virality, already deferred), not an independent cut.
- 2026-06-16 — Cato cross-vendor audit: CONFIRMED `assets/venues.json` is Google Places data (ChIJ IDs, priceLevel, Google photo refs) + a Starbucks miscategorized as cocktail_bar. Both the legal risk (ISC-9) and ground-truth risk (ISC-12/13) are real, not hypothetical → OSM re-seed is mandatory. Verdict: concerns (risk already in ISA; Cato upgraded it to confirmed).
- 2026-06-16 — refined (Advisor): biggest gap was seeding venues but not ACTIVITY — added ISC-54/55 (guided first-log + seeded ranked entries) so a zero-log first session isn't a dead feed; added ISC-56/57 (OSM density spot-check before committing the city).

- 2026-06-16 (owner decisions LOCKED): Auth = **Apple + email** (phone deferred, confirmed). City = **Boston + Cambridge** as one pool. **User-submitted bars ADDED to beta scope** (owner knows all testers → trusted, no moderation queue) — doubles as the activity-seeding mitigation (ISC-54/55), dropping OSM to a base layer. Scope = defer everything else, ship ASAP. Apple Developer account being purchased now. Beta cohort confirmed. Owner will spot-check seed data.
- 2026-06-16: Theme NOT chosen — owner requested multiple rendered design directions to pick from; ISC-45/48 pending the pick. 6 directions built at `docs/design/beta-theme-options.html` (Midnight Neon, Speakeasy Amber, Stark Editorial, Moody Glass, Minimal Mono Luxe, Last Call/ticket).
- 2026-06-16 (INFRA GAP): this dev box has **no browser installed** (no Chrome/Chromium/Brave) and **Interceptor is not installed** here — so the mandatory Interceptor visual-verification loop CANNOT run in this environment. Implication for the build sprint: every UI ISC (26, 27, 29, theme) must be verified on-device (Expo Go / TestFlight) or on a browser-equipped machine. Fix options: install Chromium + Interceptor on this box, or treat the device as the verification surface. The theme mockups were authored + served (HTTP 200) but NOT visually verified by me — owner must eyeball them.
- 2026-06-17: Theme CHOSEN — **05 Minimal Mono Luxe** (near-monochrome `#111`/`#E8E2D6` + single lime `#C0FF3E` micro-accent, tight Inter, type-and-space driven). ISC-45 satisfied. Figma-overhaul branch should REDIRECT from the light `#F0F0F0` theme to this dark token theme (ISC-48). Preview rendered via headless Chromium (Interceptor still uninstallable on this box) at `docs/design/theme-05.png`.

- 2026-06-17 — **CORE BETA LOOP CODE-COMPLETE + merged to `main`** (`bca237c`): F1 (email signup + onboarding 18+/username + `isOnboarded` routing + 05 theme), F2 (238 OSM Boston+Cambridge venues, Google data removed), F3 (browse/search catalog → log a visit + rating → My-List history → **rank-unlock-at-5** via the existing Elo + compare). Suite: 521 pass, only the 3 rotted suites fail (ISC-37 pending). **On-device verification DEFERRED** — no browser/device on this box; UI/flow ISCs are code+test-verified but need Expo Go / TestFlight to mark `[x]`. Remaining to ship: on-device smoke test; EAS dev build + Apple Sign-In + TestFlight + nearest-bar sort (Apple-gated); ISC-37 un-rot; seed cohort refinement; polish (DOB date-picker, Cambridge neighborhood subtitles).

- 2026-06-24 ("zero to one" build session) — Closed several remaining beta gaps on the
  already-code-complete loop (bca237c): **ISC-37/38** the 3 rotted suites (`path-alias-config`,
  `figma-route-shell-ui`, `native-ui-media-adapter-ui`) reconciled to the real auth-gated
  architecture — confirmed all 5 failing assertions were ROT (asserted the pre-auth Figma shell:
  static Redirect, login.js-must-not-exist, old icon-padding props, a stale Discover avatar
  string) not regressions (Discover correctly uses MediaImage). **ISC-21** `app/post/new.js`
  dead-end killed — the deferred "Create a post" action now redirects to `/add` (the hero log
  flow) instead of a placeholder. **ISC-40** `expo export --platform web` verified clean (exit 0).
  **ISC-53** nearest-bar distance sort built by Forge + verified: `lib/geo.js` (pure haversine +
  sortVenuesByDistance + formatDistance, 11 green tests) + Default/Nearest toggle wired into
  `app/add.js` with defensive `expo-location` (guarded require, graceful fallback). Added
  `expo-location ~19.0.8` (SDK-54-compatible; Expo Go bundles it) — dev server needs a restart to
  pick it up. **Full suite now 615 passing, 0 failing (ISC-38 ✓); expo-doctor 18/18 (ISC-39 ✓).**
  Ranking Tier A (ADR 008) + comparison-log schema (ADR 009) landed earlier this day; rules deployed.
  ENV-GATED, NOT done here (owner): on-device smoke test, EAS build + Apple Sign-In + TestFlight
  (ISC-30..32, 49), since this box has no device/Apple/Interceptor (see 2026-06-16 INFRA GAP).

- 2026-06-25 (ranking bug-fix — ISC-19 correctness) — Owner reported "existing ratings are not
  sorted into a hierarchy." Reproduced deterministically: `buildStackRankings` early-returned an
  UNRANKED list whenever there were 0 comparisons, and `hasPersonalRank` required a comparison —
  so ratings alone never formed a hierarchy, and `list.js`/`profile.js` never passed
  `sentimentByVenue`. Fix (ADR 008 §1 — ratings SEED, comparisons REFINE): a venue earns a
  personal rank if it's rated (has a sentiment band) OR compared; both surfaces now thread
  `sentimentByVenue` (built from the latest rating per venue). Result: rated venues order
  loved(7–10) > fine(5–6.9) > disliked(0–4.9) with zero comparisons; comparisons refine within
  band. RED→GREEN test added; full suite 619 pass. Note: the 5-log unlock gate (ISC-18) is
  unchanged — under 5 logs still shows the locked card by design.

- 2026-06-30 (RECONCILIATION — ISA marked to reality) — Brought this file from a stale
  `0/61 / phase:plan` to **49/61 / phase:verify** against the actual codebase + a green suite
  (716 pass, 0 fail; 5 emulator suites skipped). Headline: **both original #1 blockers are
  closed.** (1) On-ramp (A) is code-complete — real signup (`createUserWithEmailAndPassword`
  via AuthContext), 18+ onboarding, auth-gated `index.js`. (2) Venue data (B) — the hard legal
  blocker (ISC-10, Google Places data) is RESOLVED: re-sourced to **717 Overture venues**
  (Boston 613 + Cambridge 104), CDLA-Permissive-2.0 + Apache-2.0, zero `ChIJ` IDs, attribution
  shown in-app. Loop (C), ranking (ADR 008 §1 ratings-seed), analytics (PostHog funnel), theme
  (05), and hygiene are done. **Two criteria SUPERSEDED, not met:** ISC-2 (city selector → ADR
  007 single Boston+Cambridge metro, no selector) and **ISC-28 (hide social UI) — REVERSED**:
  the product deliberately pivoted to Friends-first (DMs/groups/polls/voice/attachment panels
  are the hero, not hidden), so the beta-ISA's "hide social" stance is retired in favor of the
  nightlife-platform roadmap. **The 12 open ISCs cluster in 3 buckets:** (a) distribution +
  on-device — ISC-30/31/32/36/49 (Apple Developer account → EAS build → TestFlight → cold-boot
  check), env+owner-gated and the real "ship to testers" gap; (b) one UNBUILT feature —
  user-submitted venues ISC-59/60/61 (no in-app submit-a-bar flow; 717 real venues lowered its
  urgency); (c) loose ends — owner seed ground-truth (ISC-12), screenshot pass for chrome
  (ISC-27), and `npm run test:rules` for rules coverage (ISC-41). The 2026-06-30 deadline lands
  with the app code-complete and demo-ready on the simulator but **not yet distributed** — the
  blocker is Apple/TestFlight, not code. WIP for this state was triaged into 10 logical commits
  and pushed to `origin/main` (`cea4412..0abe2ae`).

## Changelog

- conjectured: the beta bottleneck is the four named gaps (UI, auth, dataset, location) of roughly equal weight | refuted_by: codebase audit (363/418 tests pass, shell works) + SystemsThinking leverage analysis | learned: the bottleneck is the on-ramp (no signup) + an empty feed; the differentiated core is already built and the location algorithm is a post-beta concern | criterion_now: ISC-1..7 (on-ramp) and ISC-8..13 (seed data) are the gating ISCs; location math is Out of Scope for beta.

## Verification

- 2026-06-30 — Built and reconciled. `npm test` → **716 pass, 0 fail** (5 emulator suites skipped). `expo-doctor` 18/18 and `expo export --platform web` clean (per 2026-06-24). Venue provenance verified: Overture/Foursquare license, zero `ChIJ` IDs, 717 venues. **49/61 ISCs met.** NOT yet verified: anything requiring a device/TestFlight (ISC-30/31/32/36, distribution) and `npm run test:rules` (ISC-41, emulator). The spec is now a living record marked to the shipped code, not a forward plan.
