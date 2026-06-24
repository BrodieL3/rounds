# ADR 009: Global "best in the world" ranking is a per-cohort Bradley-Terry posterior, ranked by a conservative lower bound; personal and global are two reads of one comparison log

- Status: Accepted (2026-06-24)
- Date: 2026-06-24
- Relates to: ADR 008 (personal ranking — banded Elo + binary-search selection), ADR 007
  (location is a venue property; metro is the lens), ADR 005 (Rating canonical opinion)
- Evidence: `docs/design/ranking-algorithm-research.md` + simulation `docs/design/ranking-sim.mjs`

## Context

The owner wants Rounds to answer **"what is the best cocktail bar / club in the world?"**
per place-type, and wants the ranking strong enough to drive good suggestions later — and
authorized an E5-depth investigation to get the algorithm right.

This is a **different object** from the personal "feels like mine" list of ADR 008. "Best in
the world" needs a **global, cross-user, cardinal** strength per venue, **per cohort**,
comparable across venues no single person has both visited. Research (full detail and a
reproducible Monte Carlo in `docs/design/ranking-algorithm-research.md`) established:

- **Beli is the wrong model for this goal.** Beli computes *personal/collaborative* scores
  (predicted-you, predicted-friends) and deliberately publishes **no** single global ranking.
  Averaging normalized personal ranks is a biased global estimator — across 40 simulation
  seeds it was the **consistently weakest** global recoverer (mean Spearman 0.244 vs the
  conservative bound's 0.957), and negative in the dense single-seed regime. Beli stays the
  model for Tier A (personal), not Tier B (global).
- **Bradley-Terry (BT) is the right model.** BT is the statistical model Elo approximates
  ("Elo = incremental SGD on the BT log-likelihood"), and it is what LLM-arena leaderboards
  actually use to turn thousands of pairwise votes into one stable global ranking. The sim
  confirmed BT-with-prior ≥ online Elo on well-sampled venues across every regime.
- **Rank by a conservative lower bound.** The highest-leverage single decision: on the *same*
  ratings, ranking by `mean − k·sd` lifted global Spearman from 0.04 → 0.66–0.98 by correctly
  burying under-sampled venues, and held a true-top-5% venue with only 2 lucky wins at the
  51st percentile instead of naive Elo's over-promoted 85th.
- **Connectivity is the real obstacle, and "world" is an asymptote.** Pairwise ranking is
  globally comparable only if the comparison graph connects. Cities that share no rater have
  **zero** cross-signal — their order is pure prior. So the credible launch claim is "best in
  {metro}"; "best in the world" is reached as density grows.
- **Gaming is an input-layer problem.** The sim refuted the hope that the math defends the
  board: 60 fake wins push a true-bottom venue to ~100th percentile under *every* method,
  including conservative-bound and BT-with-prior. Credibility rests on input-layer defenses.

## Decision

### 1. Two tiers, one comparison log, a one-directional firewall

Personal and global are **two reads of one append-only comparison event-log**, answering
different questions:

- **Tier A — personal** (ADR 008): per-user, per-cohort, sentiment-banded Elo with
  binary-search comparison selection → "your list." Unchanged.
- **Tier B — global** (this ADR): per-cohort aggregate over **all** users' comparisons → "best
  {cohort} in {scope}."

> **Firewall (non-negotiable):** Tier B **never writes back to Tier A**. It is an aggregate
> *view*, not a competing position store. Tier B will legitimately disagree with a user's
> personal Elo — that is correct, because they answer different questions. This is what keeps
> the design from re-tripping ADR 008's rejected "two stores that can disagree" hybrid: there
> is still exactly one *position* store (Tier A); Tier B is a derived consensus.

### 2. Tier B algorithm: per-cohort Bradley-Terry posterior, ranked by lower credible bound

- **Per cohort = the partition scope, not a different algorithm.** Six cohorts → six
  leaderboards. We never compare across cohorts (a dive bar is never matched to a wine bar).
  The owner's "different systems for different types" intuition is correct in spirit and
  realized as *partition-by-cohort*, one shared estimator. (A cross-cohort "best bar overall"
  is a secondary view via within-cohort percentile, not a new model.)
- **Estimator: Bayesian Bradley-Terry with a per-cohort prior**, recomputed as a periodic
  batch job (nightly-class), with **online Elo as an optional cheap interim update** between
  recomputes. BT yields a **posterior mean + variance per venue** in one engine — no separate
  Glicko/TrueSkill RD machinery is introduced.
- **Rank by the BT posterior lower credible bound** `mean − k·sd` (k a tuned constant). This
  is the conservative-ranking mechanism the sim found dominant and the standard leaderboard
  practice (Glicko `μ−2RD`, TrueSkill `μ−3σ`) — here sourced from the BT posterior itself.
- **Minimum-comparisons threshold to appear.** A venue below the threshold is "provisional"
  and excluded from the public board (still rankable privately). Stops 1–2-comparison venues
  from topping the chart and matches the sim's finding that thin venues are noise.
- **Prior = connectivity glue.** Every venue's prior is its sentiment distribution (loved >
  fine > disliked), later augmentable with external popularity. The prior shrinks low-data and
  disconnected venues toward the cohort mean, making the scale comparable — *with the explicit
  caveat below.*

### 3. Honest scope: "best in {metro}" now, "best in the world" as the asymptote

Where two metros share no common rater, BT has no cross-signal and their relative order is
**entirely the sentiment prior** — i.e. "sorted by band," not measured. Therefore:

- The board's **honest scope grows with density**. At a Boston+Cambridge beta catalog (ADR
  007) the credible product claim is **"best {cohort} in Boston."** The UI scopes to metro by
  default and only widens the claim as cross-metro comparison density and catalog breadth
  accumulate. Overclaiming "world" on thin data is a trust risk and is explicitly avoided.
- Cheap connectivity boosters (post-beta): occasional **cross-metro comparison prompts** to
  power users to add bridging edges.

### 4. Input-layer gaming defenses, in leverage order (not co-equal)

1. **Per-user influence caps (primary, cheap, ship with Tier B).** Cap any single rater's net
   contribution to a venue's global score (e.g. at most one decisive comparison per
   rater–venue pair counts toward Tier B; log-dampen repeats). Directly defeats the sim's
   "one user, 60 comparisons" attack. Depends on schema §5 making rater→venue contribution
   reconstructable.
2. **Rater-trust weighting (medium, post-beta).** Weight comparisons by reputation (account
   age, breadth, consensus agreement). A reputation subsystem.
3. **Visit verification (the long pole, post-beta).** Geo check-in / receipt / presence proof
   so only plausible visitors can compare. A whole feature; the real expense — named as such,
   not buried in a list. Anomaly detection on rating velocity spans all three.

### 5. The schema is the deliverable — and the only irreversible decision

Tier B is **designed now, built post-beta**, so the one thing that must be right today is the
comparison event-log schema, such that Tier B is buildable later **with zero migration**. Each
comparison record persists:

| Field | Why |
|---|---|
| `userId` | rater identity; per-user caps + trust weighting |
| `venueA`, `venueB` | the pair |
| `result` (`venueA` \| `venueB` \| `too-tough`) | outcome (too-tough = draw); canonical field name is `result` |
| **`cohort` (recorded at capture time)** | the lens the user was in — **not** derived from venue place-type later (venues can be multi-type; intent is unrecoverable after the fact) |
| `sentimentA`, `sentimentB` (each venue's user band, or null) | the connectivity prior; lets Tier B weight by band |
| `metro` / `city` | scope + cross-metro edge detection (ADR 007) |
| `createdAt` (required) | recency, drift, velocity anomaly detection |
| **`sessionId` + `sequence`** | reconstruct "one user did N comparisons on one venue" — the gaming vector; trust-weighting depends on it |
| **`context`** (`pairwise` \| `placement-search` \| `organic-rerank`) | the comparison's *intent* (outcome lives in `result`); lets Tier B down-weight forced placement taps |
| **`schemaVersion`** | zero-migration evolution of the log |

`app/compare.js` writes each record through `lib/comparisons/comparison-payload.js` (the
canonical builder), adding `sentimentA/sentimentB`, `city`/`metro`, `sessionId`+`sequence`,
`context`, and `schemaVersion: 2` to the prior `userId/cohort/venueA/venueB/result/createdAt`.
Firestore rules require `schemaVersion` on create so no non-v2 record can enter the log.

**Tier-B build guidance** (from the cross-vendor audit): consume only `schemaVersion >= 2`, and
compute per-user influence caps by grouping on `(userId, venueId)` **across all sessions** — not
within a single `sessionId`. `sessionId`+`sequence` reconstruct bursts for anomaly detection, but
the cap itself aggregates per rater–venue globally. **Acceptance test:** with all the above
present, Tier B is buildable later with no migration.

## Consequences

- **Now (beta-aligned, small):** extend the comparison write in `app/compare.js` /
  `lib/personal-rankings.js` to the §5 schema. Land ADR 008's Tier-A changes. That is the
  entire shipping surface for ranking pre-beta.
- **Post-beta (Tier B):** `lib/global-ranking.js` — batch BT-with-prior per cohort + posterior
  lower-bound ranking + min-comparison threshold; `functions/` scheduled recompute writing
  `leaderboardEntries` (already a backend-reserved collection per CLAUDE.md); per-user
  influence caps in the aggregation; metro-scoped leaderboard UI. The `ranking-sim.mjs`
  methodology becomes the offline test harness for the estimator.
- **Cost:** Tier B is a batch job + a reputation/verification roadmap, not a per-tap change.
  Correctly deferred until comparison density exists — building it against an empty graph
  would rank noise.
- **Known property:** early cross-metro ordering is prior-dominated (§3); the product must
  scope its claim to match the data.

## Alternatives considered

- **Average Beli-style personal scores into a global board.** Rejected: empirically the
  consistently weakest global estimator over 40 seeds (mean Spearman 0.244); bakes in
  selection + normalization bias; Beli itself declines to do this.
- **Online Elo as the global source of truth.** Workable and already built, but path-dependent
  and uncertainty-free; BT-with-prior dominates it for a stable periodic leaderboard, and the
  posterior is needed for the conservative bound anyway. Elo is kept only as the optional cheap
  interim update and as Tier A's engine.
- **Introduce Glicko-2 / TrueSkill for uncertainty.** Rejected as a *third* engine: BT's
  posterior already supplies mean + variance, giving the same conservative-bound behavior with
  one model.
- **Expert-panel curation (World's 50 Best model).** Higher integrity, but doesn't scale to a
  solo pre-revenue app and abandons the personal/data flywheel. We instead buy integrity at the
  input layer (§4).

## Scope recommendation

Ship **only the §5 schema extension** + ADR 008's Tier-A work for the beta. Keep **Tier B
(BT global ranking) designed-not-built** until comparison density warrants it. Scope the
public claim to **metro** until the graph connects. Owner decides when density crosses the
threshold to turn Tier B on.
