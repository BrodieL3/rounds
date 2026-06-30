# ADR 010: Personal ranking (Tier A) is a per-user Bayesian Bradley-Terry posterior ranked by a conservative lower bound, superseding the banded-Elo engine of ADR 008 §1

- Status: Accepted (2026-06-30)
- Date: 2026-06-30
- Supersedes: **ADR 008 §1** (the Elo position engine). ADR 008 §2 (comparison
  *selection* as the few-taps UX) and §3 (hard-clamped banded 0–10 display) are
  **preserved**.
- Relates to: ADR 009 (Tier B global Bradley-Terry + the one-directional firewall —
  **reaffirmed, unchanged**), ADR 007 (location is a venue property; metro is the lens),
  ADR 005 (Rating canonical opinion + public projection)
- Evidence: `docs/design/ranking-algorithm-research.md` + simulation
  `docs/design/ranking-sim.mjs` (the Monte Carlo behind ADR 009; to be extended to the
  per-user BT estimator as the offline harness)
- Touches: `lib/ranking.js` (retired as authority), `lib/ranking-bt.js` (new),
  `lib/duel-select.js` (new, replaces `lib/compare-select.js`), `lib/scoring.js`,
  `lib/personal-rankings.js`, `lib/comparisons/comparison-payload.js`, `app/compare.js`,
  `app/venue/[id]/rate.js`, `app/add.js`

## Context

ADR 008 chose a sentiment-banded Elo (`K=16`, 10 epochs, seed 1500) with binary-search
comparison *selection* for Tier A, explicitly because "the Elo engine already exists and is
tested, so replacing it is *more* 7-day risk than evolving it" before the 2026-06-30 beta.
**That beta date is today. The risk constraint that justified Elo has expired** — so the one
load-bearing reason ADR 008 kept Elo over the statistically better model no longer holds.

In use, the implemented Tier A carries three defects and one design limitation:

- **Defect 1 — logging is heavyweight.** `app/venue/[id]/rate.js` requires a sentiment and
  loads the user's entire friends list on mount (an `onSnapshot` + N `getDoc`s) plus photos
  and companion tagging before anything saves. Users rarely log. This is the owner's
  "users cannot log visits."
- **Defect 2 — the too-tough freeze.** `lib/compare-select.js` sets `frozen = true` and
  returns `null` *forever* for a venue after a single "too tough," permanently removing it
  from placement — a divergence from ADR 008 §2, which intends "insert adjacent," not a
  permanent freeze across all future sessions.
- **Defect 3 — the entry gate.** `app/compare.js` refuses to start unless the user already
  has 2+ Ratings in the *same* Cohort, otherwise it alerts and `router.back()`s — harsher
  than ADR 008 §2's "open a placement session off the freshly-logged venue."
- **Limitation — Elo is noise on sparse data.** `K=16` × 10 epochs over the handful of
  comparisons a real nightlife user produces is essentially the seed plus a random walk:
  uncertainty-free, path-dependent, and it lets a 2-comparison venue outrank a well-compared
  one. This is the root cause of "doesn't feel like mine / no ranking."

**The correction (load-bearing insight):** ADR 009 already established — with a 40-seed
Monte Carlo — that **Bradley-Terry with a prior, ranked by the conservative lower bound
`mean − k·sd`, dominates online Elo across every regime** (the lower bound alone lifted
global Spearman from 0.04 to 0.66–0.98 by correctly burying under-sampled venues), and that
BT's posterior supplies **mean + variance in one engine** — which is exactly why ADR 009
*rejected* introducing Glicko/TrueSkill as a redundant third engine. That same evidence
applies to Tier A: the personal list is a smaller, per-user instance of the identical
problem — rank venues per Cohort from sparse pairwise outcomes. Running the house BT
estimator for *both* tiers means one estimator family, not three, and it fixes the
sparse-data noise at its root.

**This does not disturb ADR 009's firewall.** Tier A's BT is fit per-user over that user's
own comparisons, with the user's own **sentiment** as the prior; it never reads the global
(Tier B) board. There is still exactly one *position* store per user. (An earlier proposal to
cold-start a user's personal list from the global ranking was considered and rejected for
precisely this reason — see Alternatives.)

## Decision

### 1. Tier A position authority moves from Elo to per-user Bayesian Bradley-Terry

New `lib/ranking-bt.js` becomes the position authority, retiring `lib/ranking.js` (Elo) from
that role. Per Cohort, fit a latent strength per venue where `P(A beats B) = σ(θ_A − θ_B)`
over the user's Comparisons, yielding a **posterior mean + variance per venue** in one engine.

ADR 008 §1's three "evolve Elo" changes are superseded, but their *intent* carries over into
the BT model:

- **Sentiment-seeding → the BT prior.** A venue's prior mean is its sentiment band
  (`loved > fine > disliked` offsets), shrinking low-data venues toward the band center.
- **`too-tough` → a BT draw.** A tie pulls the two venues' strengths together (it is signal,
  not discard — this inverts ADR 008's original "too-tough changes nothing" behavior).
- **The incremental-update need** is met by re-fitting per session (per-user, per-Cohort data
  is tiny, so a full re-fit is cheap), with an optional online interim update for
  between-fit responsiveness.

Add **recency-weighting**: older comparisons contribute less to the fit, so a venue not
compared in a long time regains variance and resurfaces. This is the Tier-A analogue of the
"places change over time" property — μ is preserved, only confidence ages.

### 2. Rank by the posterior lower bound; preserve ADR 008 §3's banded display

- Order venues by the **conservative lower bound `mean − k·sd`** (k a tuned constant), not
  the raw mean — the mechanism ADR 009's sim found dominant, because it buries
  under-compared venues instead of over-promoting lucky ones.
- **ADR 008 §3 display is preserved unchanged:** hard-clamped banded 0–10
  (`loved 7.0–10.0`, `fine 5.0–6.9`, `disliked 0.0–4.9`), within-band order set by the lower
  bound. The clamp remains a *display* rule — a Loved venue can never render below a Fine one,
  so the sentiment promise holds.
- **Provisional gating:** a venue below a minimum-comparison count (equivalently, above a
  posterior-variance threshold) is `provisional` and shows no confident number. **One**
  tunable threshold governs both provisional-vs-confident display *and* placed-vs-keep-asking.
- **Promote nudge:** when a venue's head-to-head record persistently contradicts its band
  (a Fine venue keeps beating Loved venues), prompt *"move to Loved?"* The app never silently
  re-bands; it asks.

`lib/scoring.js` and `lib/personal-rankings.js` are modified to read the BT lower bound and
expose the `provisional` flag; the banded windows and the rank/score shape are otherwise as
ADR 008 §3 left them.

### 3. Comparison selection: information-gain, ADR 008 §2 UX preserved, freeze bug removed

New `lib/duel-select.js` replaces `lib/compare-select.js`. It keeps ADR 008 §2's few-taps,
"feels like Beli" placement UX, but:

- **Selects the next pair by information gain** over the BT posterior (the most-uncertain /
  closest matchup), opening off the freshly-logged venue within its band.
- **No entry gate** (fixes Defect 3): selection never bounces the user; it returns `null`
  only when the session's stopping rule is met.
- **Pair cooldown, not venue freeze** (fixes Defect 2): a "too tough" puts that *pair* on
  cooldown but both venues remain fully eligible to duel other peers.
- **Stopping rule:** ranking sessions end at the variance threshold or a soft per-session cap
  (~7–10 comparisons); tonight-decision sessions run a short bracket and declare a winner.

### 4. Logging decoupled from rating: the Stop

A **Stop** ("I was here," one tap, no sentiment) becomes a first-class lightweight object,
distinct from a **Rating** (a Stop that carries a sentiment). A Stop **never moves ranking
strength**; it feeds matchmaking priority, the rate-prompt cadence, and history. New
`lib/stops.js` holds the pure Stop payload with the Firestore write behind an adapter seam;
`app/venue/[id]/rate.js` lazy-loads friends and exposes the one-tap Stop path (fixes
Defect 1). Logging a visit and reviewing it are now two different actions.

### 5. Context-weighting, and the unchanged comparison log

- Add `tonight-decision` to the comparison `context` enum (currently
  `pairwise | placement-search | organic-rerank`).
- Tier A weights comparisons by context **at fit time**: `pairwise`/`placement-search` at
  full weight, `tonight-decision` at a heavy discount (≈0.25×). Revealed preference still
  counts, but the convenience confound of "what's open and close tonight" is damped. The
  discount is applied in the fit, never stored.
- The append-only comparison log schema (ADR 009 §5, `schemaVersion: 2`) is otherwise
  **unchanged**, so Tier B remains buildable with **zero migration**. The firewall — Tier B
  never writes back to Tier A — is reaffirmed.

## Consequences

- **Now:** new `lib/ranking-bt.js`, `lib/duel-select.js`, `lib/stops.js`; modify
  `lib/scoring.js`, `lib/personal-rankings.js`, `lib/comparisons/comparison-payload.js`;
  rewire `app/compare.js` (the Tonight duel screen), `app/venue/[id]/rate.js` (lazy friends +
  one-tap Stop), `app/add.js` (Stop affordance). `lib/ranking.js` is retained only for
  legacy/migration reads, not as the position authority.
- **Testing:** the six pure modules (`ranking-bt`, `duel-select`, `scoring`,
  `personal-rankings`, `stops`, `comparison-payload`) get unit tests asserting *behavior and
  properties* (ordering, clamping, convergence, provisional gating, decay direction, pair
  cooldown) — never specific posterior numbers, which are tuning detail. `ranking-sim.mjs`
  extends to cover the per-user BT estimator as the offline harness.
- **Cost:** a BT fit is more compute than a single Elo step, but per-user per-Cohort data is
  tiny, so a per-session re-fit is cheap; the optional online update covers responsiveness
  between fits.
- **Known properties:** a brand-new venue shows `provisional` until compared (honest, not a
  regression); rank-percentile display still shifts slightly when a venue is
  added/removed/re-rated (carried from ADR 008 §3); `k`, the sentiment prior offsets, the
  recency half-life, and the provisional threshold are tunable magic numbers.

## Alternatives considered

- **Keep evolving Elo (ADR 008 §1 as written).** Rejected now that the 7-day-risk rationale
  has expired: Elo stays uncertainty-free and noisy on sparse data, and provisional/decay
  would be bolted on by hand — exactly what BT's posterior gives for free. Elo is kept only as
  an optional cheap interim update and for legacy reads.
- **Introduce TrueSkill / Glicko-2 for Tier A's uncertainty.** Rejected for the same reason
  ADR 009 rejected it for Tier B: a redundant *third* engine when BT's posterior already
  supplies mean + variance. One estimator family across both tiers.
- **Cold-start the personal list from the global (Tier B) board.** Rejected: it violates
  ADR 009's non-negotiable firewall and undercuts the "feels like *mine*" promise. The
  personal prior is the user's own sentiment, full stop.
- **Pure Beli binary-insertion (insertion order = truth, no model).** Rejected as in ADR 008:
  no recovery from a misclick and no convergence on intransitive preferences without a
  re-insert log — BT absorbs both for free.

## Scope recommendation

Land **§1–§4** (BT engine + lower-bound/banded display + information-gain selection + the
Stop) as the Tier-A rebuild, and keep **§5** (the `tonight-decision` context weighting and
the Tonight duel UX) in the same pass since it shares the selection module. Keep **Tier B
designed-not-built** (ADR 009) until comparison density warrants it. **MVP cut:**
`ranking-bt` + `duel-select` + `stops` + minimal wiring; provisional gating, decay, and the
promote-nudge can follow without any schema change. Owner decides the sequencing against the
post-beta backlog.
