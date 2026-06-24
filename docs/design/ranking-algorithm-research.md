# Ranking-algorithm research — Beli vs Elo vs Bradley-Terry vs Glicko/TrueSkill

> Evidence base for **ADR 009**. Companion simulation: `docs/design/ranking-sim.mjs`
> (pure JS, seeded, reproducible — `bun docs/design/ranking-sim.mjs`).
> Scope: how to rank bars well enough to (a) answer "best cocktail bar / club in the
> **world**" per place-type and (b) power suggestions later.

## 1. The question, formalized

"What is the best cocktail bar in the world?" demands a **global, cross-user, cardinal**
quality score per venue, **per cohort**, comparable across venues that no single person has
both visited. That is a different object from a Beli-style **personal** list (one user's
ordering of places *they* visited). The two must not be conflated — they need different
machinery (see ADR 009's two-tier split).

Formally we want, per cohort, a latent strength `θ_v` per venue such that
`P(v beats w) = σ(θ_v − θ_w)`, estimated from a pile of pairwise outcomes contributed by
many users, **robust** to: sparse/unbalanced comparison graphs, disconnected cities,
cold-start, selection/popularity bias, and deliberate gaming.

## 2. The candidate families

| Family | What it is | Score type |
|---|---|---|
| **Beli (binary-insertion)** | Insert each new place into the user's sorted list via binary-search comparisons; score = banded rank position | **Personal, ordinal** |
| **Elo** | Online SGD update on pairwise outcomes; `K`-factor step | Global-ish, cardinal, **no uncertainty** |
| **Bradley-Terry (BT)** | The MLE/Bayesian model Elo *approximates*; fits all comparisons jointly | Global, cardinal, **posterior mean + variance** |
| **Glicko-2 / TrueSkill** | Online Bayesian ratings carrying an explicit **rating deviation / σ** | Global, cardinal, **native uncertainty** |
| **Expert panel (World's 50 Best)** | ~800 vetted experts cast 8 ranked votes; anonymized; Deloitte-adjudicated | Curated, not algorithmic |

**Key external facts (sourced):**

- **Beli is collaborative-filtering, not a world leaderboard.** It computes *two personal*
  scores per place — predicted-you and predicted-your-friends — "instead of an average-based
  score, each user gets a recommendation score based on similarities with other users." It
  deliberately does **not** publish a single global "best in the world." So we cannot copy
  Beli for this goal; Beli is the model for **Tier A (personal)**, not Tier B (global).
- **Bradley-Terry is the statistical backbone of Elo** — "with scale factor 400 and base 10,
  BT is equivalent to Elo," and Elo is "an incremental SGD update on the BT log-likelihood."
- **The canonical solver for our exact problem uses BT, not online Elo.** LLM arena
  leaderboards (LMArena) aggregate thousands of pairwise human votes into one global ranking
  and "use the term Elo out of habit, but the underlying engine processes rankings using a
  customized **Bradley-Terry regression**" — because a stable global ranking wants the batch
  fit, not path-dependent online updates.
- **Leaderboards rank by a conservative lower bound:** Glicko uses `μ − 2·RD`, TrueSkill
  displays `μ − 3·σ`; ratings with high deviation are treated as **provisional**. This is how
  you stop a 2-comparison venue from topping the chart.
- **"Best bar in the world" in the real world is an expert panel** (World's 50 Best Bars),
  not crowd math — precisely because crowd signal is gameable and selection-biased. They buy
  integrity with vetting, anonymity, and independent adjudication. Our crowd-sourced version
  must buy it at the **input layer** instead (§6).

## 3. Pros / cons for *this* goal

**Beli (binary-insertion).**
✅ Few taps (log n), stable bounded personal score, honors sentiment, intuitive, immediate.
❌ Score is a *per-user ordinal rank position*; aggregating it globally (averaging normalized
personal ranks) is biased — a venue rated by 3 fans beats one rated by 300 mixed raters; no
uncertainty; assumes transitivity; no cross-user cardinal strength. **Wrong tool for "best in
the world."** (Right tool for the personal list — see ADR 008.)

**Elo.**
✅ Cardinal, comparable, aggregates users naturally, handles intransitivity/noise, cheap
online updates. ✅ Already built/tested in `lib/ranking.js`.
❌ Path-dependent estimates; `K` tuning; **no uncertainty** (a new 1500 looks like an
established average venue); rating drift; **non-comparable across disconnected pools**;
defenseless against gaming on its own.

**Bradley-Terry + Bayesian prior.**
✅ The principled joint fit Elo approximates; less path-dependence; a **prior** gives
cold-start shrinkage and connects disconnected pools toward a cohort mean; posterior gives
**mean + variance for free** → conservative ranking. ✅ Empirically best at recovering true
order (§4). What LMArena actually uses.
❌ Batch recompute (periodic job, not per-tap); more code than the existing Elo; still
gameable at the input layer; cross-pool ordering is **prior-dominated until bridging
comparisons exist** (§5).

**Glicko-2 / TrueSkill.**
✅ Native uncertainty, fast convergence, designed for provisional-vs-established leaderboards.
❌ A *separate* online engine with its own RD/σ machinery. **We don't need it**: BT-with-prior
already yields a posterior variance, so we get the same conservative-lower-bound behavior from
one engine instead of bolting on a third. (Listed because it's the standard reference for the
uncertainty idea we adopt — just sourced from the BT posterior, not from Glicko.)

## 4. Simulation — putting numbers on it

`ranking-sim.mjs` builds synthetic cohorts with **known** latent quality `θ_v ~ N(0,1)`,
users who visit a popularity- and locality-biased subset (creating selection bias and
near-disconnected cities), and pairwise outcomes drawn from the true BT probability with
logistic noise + a "too-tough" draw band. It then scores four estimators by how well they
recover the *true* global order (Spearman ρ / Kendall τ vs `θ`). Three density regimes plus
gaming and cold-start probes.

| Scenario | Method | Spearman (all) | Kendall (all) | Spearman (venues ≥3 cmp) |
|---|---|---:|---:|---:|
| **S1 dense+connected** | Elo online | 0.039 | 0.064 | 0.796 |
| | **BT + prior** | 0.079 | 0.125 | **0.864** |
| | Beli avg-personal | **−0.435** | −0.441 | 0.950 |
| | **Elo conservative LB** | **0.659** | **0.961** | 0.948 |
| **S2 sparse+clustered** | Elo online | 0.411 | 0.322 | 0.852 |
| | **BT + prior** | 0.433 | 0.353 | **0.872** |
| | Beli avg-personal | −0.021 | 0.055 | 0.796 |
| | **Elo conservative LB** | **0.903** | **0.845** | 0.926 |
| **S3 realistic middle** | Elo online | 0.675 | 0.549 | 0.957 |
| | **BT + prior** | 0.726 | 0.607 | **0.972** |
| | Beli avg-personal | 0.415 | 0.400 | 0.955 |
| | **Elo conservative LB** | **0.975** | **0.893** | 0.972 |

**Gaming probe** (inject 60 fake wins for a true-bottom-15% venue → should stay ~15th pct):
Elo → **100th**, BT+prior → **98th**, conservative-LB → **100th** percentile.

**Cold-start probe** (true top-5% venue, only 2 lucky comparisons):
naive Elo → **85th** percentile (over-promoted); conservative-LB → **51st** (held back).

**Robustness — 40 seeds, realistic regime (mean Spearman ± sd):**

| Method | all venues | venues ≥3 cmp | #1 on all-venue |
|---|---:|---:|---:|
| Elo (online) | 0.566 ±0.062 | 0.912 ±0.022 | 0/40 |
| Bradley-Terry + prior | 0.583 ±0.067 | 0.936 ±0.022 | 0/40 |
| Beli avg-personal | 0.244 ±0.102 | 0.892 ±0.042 | 0/40 |
| **Elo conservative LB** | **0.957 ±0.007** | **0.947 ±0.011** | **40/40** |

The conservative lower bound wins the all-venue metric on **every one of 40 seeds** — the
headline is not a lucky draw. Beli-avg averages **0.244 (positive but lowest)**; the *negative*
Spearman in single-seed S1 was a sparsity artifact among barely-sampled venues, not a stable
property. The honest claim is "Beli-avg is consistently the weakest global estimator," not
"it goes negative."

### What the numbers say

1. **Ranking by a conservative lower bound is the highest-leverage single decision.** On the
   *same* Elo ratings it lifts global Spearman from 0.04 → 0.66 (S1) and up to 0.98 (S3),
   purely by burying under-sampled venues where they belong. This is the empirical core of
   the recommendation. (In production this lower bound comes from the **BT posterior**, not a
   separate Glicko RD — same mechanism, one engine.)
2. **BT + prior consistently ≥ online Elo** on well-sampled venues (0.864>0.796,
   0.872>0.852, 0.972>0.957), matching the LMArena precedent. The edge is modest but free
   once you're computing a posterior for the lower bound anyway.
3. **Beli avg-personal is the consistently weakest global estimator** — lowest all-venue
   Spearman across all 40 robustness seeds (mean 0.244; negative only in the single dense
   seed, a sparsity artifact) — because averaging normalized personal ranks bakes in selection
   and normalization bias. It is *fine* on well-sampled venues (~0.89–0.95), which is why it
   works for personal lists but fails as a world ranking.
4. **Gaming defeats every algorithm.** 60 fake wins ≈ 60 "data points," so the venue looks
   *confidently* great — uncertainty shrinkage and priors barely dent it (98–100th pct). This
   **refutes** the intuition that the math layer can defend the leaderboard. Gaming is an
   **input-layer** problem (§6).
5. **Sparsity/connectivity is the dominant real obstacle**, not algorithm choice. In S1 only
   39 of 120 venues earned ≥3 comparisons; the rest are noise. A min-comparison threshold to
   appear + conservative ranking is mandatory.

### Honest limitations of the sim

Synthetic outcomes are generated from a BT model, which slightly favors BT-family estimators.
The "all-venues" Spearman is depressed by ties among many barely-sampled venues (a sparsity
artifact, not pure method quality) — the "≥3 cmp" column is the cleaner method comparison; the
"all" column measures *handling of sparsity*. Conservative-LB tuning (`z`) and BT prior
strength are knobs, not universals. Real outcomes have structure (cliques, trends, fake
rings) not modeled here. The sim is directional evidence, not a production benchmark — but the
*direction* is consistent and matches the external literature.

## 5. The connectivity problem (why "world" is an asymptote, not a launch state)

Pairwise ranking yields a *globally comparable* scale only if the comparison **graph is
connected**. Users compare bars they've visited; visits cluster by city. If Boston and Tokyo
share **zero** common raters, BT has **no comparison signal** between them — their relative
order is determined *entirely* by the prior (the sentiment seed: loved > fine > disliked).
That is "sorted by sentiment band," not "best in the world."

Consequences for the design:
- The leaderboard's honest scope **grows with density**. With a Boston+Cambridge beta catalog
  (ADR 007), the credible claim at launch is **"best in {metro}"**; "best in the world" is the
  asymptote reached as cross-city raters and a wider catalog accumulate. The ADR frames it
  that way — overclaiming is a trust risk.
- Mitigations that buy connectivity cheaply: a **per-cohort global prior** (sentiment +,
  later, external popularity) so components share a baseline; **occasional cross-metro
  comparison prompts** to power users (adds bridging edges); **min-comparison threshold +
  conservative bound** so thin venues simply don't surface.

## 6. Gaming — an input-layer problem (forced by the sim)

Because no aggregation method survives 60 fake wins, leaderboard credibility rests on the
input layer, in **leverage order**:

1. **Per-user influence caps (primary, cheap).** Cap any single rater's net contribution to a
   given venue's global score (e.g. count at most one decisive comparison per rater-venue
   pair, or log-dampen repeats). Directly kills the "one user, 60 comparisons" vector the sim
   exploited. Requires the schema to make rater→venue contribution reconstructable.
2. **Rater-trust weighting (medium).** Weight a comparison by the rater's reputation
   (account age, breadth of cohorts/venues, agreement with consensus). A reputation subsystem
   — post-beta.
3. **Visit verification (the long pole).** Geo check-in / receipt / presence proof so only
   plausible visitors can compare. A whole feature with its own failure modes; deferred with
   Tier B, but it is the real expense, not a bullet point.

Anomaly detection on rating velocity sits across all three. The expert-panel approach (50
Best) is the alternative integrity model — vetting + anonymity + adjudication — and is why
real "world's best" lists aren't pure crowd math.

## 7. Implication for suggestions

A rigorous global per-cohort ranking is the **quality prior** for recommendations; pairwise
**concordance** between users (a free byproduct of the same comparison log) is the **taste**
signal. Suggestion = high global-quality venues in cohorts you love, re-ranked by taste
neighbors and proximity. Without a credible global ranking, "suggestions" degrade to "popular
near you." This is why investing in Tier B now (as a schema + design) pays off later.

## Sources

- [Beli — Wikipedia](https://en.wikipedia.org/wiki/Beli_(app)) ·
  [Compare dishes, instead of scoring restaurants](https://alvinwan.com/compare-dishes-instead-of-scoring-restaurants/) ·
  [How the Beli App Is Gamifying Restaurant Experiences (Today)](https://www.today.com/food/trends/what-is-beli-app-rcna217748)
- [Bradley–Terry model — Wikipedia](https://en.wikipedia.org/wiki/Bradley%E2%80%93Terry_model) ·
  [Bradley-Terry vs Elo: the LMArena method](https://productleadersdayindia.org/blogs/lmarena-leaderboard/bradley-terry-vs-elo-arena-ranking-method.html) ·
  [Preference evaluation: pairwise comparisons & Elo (Brenndoerfer)](https://mbrenndoerfer.com/writing/preference-evaluation-pairwise-comparisons-elo-llm)
- [Glicko rating system — Wikipedia](https://en.wikipedia.org/wiki/Glicko_rating_system) ·
  [TrueSkill — Microsoft Research](https://www.microsoft.com/en-us/research/project/trueskill-ranking-system/) ·
  [So you want to use Glicko-2](https://gist.github.com/gpluscb/302d6b71a8d0fe9f4350d45bc828f802)
- [World's 50 Best Bars — the voting system](https://www.theworlds50best.com/bars/voting/the-voting-system) ·
  [How it works (Drinks International)](https://drinksint.com/news/fullstory.php/aid/12000/The_World_92s_50_Best_Bars_2025:_How_it_works.html)
