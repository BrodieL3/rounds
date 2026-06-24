# ADR 008: Personal ranking is a sentiment-banded Elo with binary-search comparison selection; suggestions are a deferred ladder

- Status: Accepted (2026-06-24)
- Date: 2026-06-23
- Relates to: ADR 005 (Rating canonical opinion + public projection), ADR 003 (Friends-first navigation), `lib/ranking.js`, `lib/personal-rankings.js`, `app/compare.js`, `ISA.md` (beta ISC-19/20)

## Context

The owner asked to "address the list system" with "an ELO system... the same comparison
scheme as Beli" that also "drives good suggestions to users." Investigation of the
current code surfaced three real defects and one important correction.

**What exists today:**

- `lib/ranking.js` — a batch Elo (`K=16`, 10 epochs, default 1500). Tested, and the
  beta `ISA.md` references it directly (ISC-19/20). It is the ranking engine of record.
- `app/compare.js` — selects pairs with **`pickRandomPair`: random over all unordered
  pairs**, "all caught up" only when *every* pairing in the cohort is compared. That is
  **O(n²) comparisons**. It also renders the **raw Elo number** (e.g. `1532`) to the user.
- `ratings.sentiment ∈ {loved, fine, disliked}` is captured at rate time
  (`lib/ratings/rating-payloads.js`) and shown in My List — but the **ranking engine
  ignores it entirely**.
- `too-tough` is recorded on a comparison and then **discarded** by the ranking
  (`ranking.js` filters it out; `ranking.test.js` even asserts it changes nothing).
- **No suggestion engine exists.** `app/(tabs)/profile.js` has an empty
  `SUGGESTED_USERS = []` placeholder; nothing consumes rankings to recommend venues.

**The correction (the load-bearing insight): Beli is not Elo.** Beli's score is a
**binary-search insertion** of each new place into a sorted list, where the three
sentiment buckets pre-partition the list into score *bands*, and the search runs *within*
the chosen band. The displayed score is the item's normalized **rank position**, not a
rating. "ELO" and "Beli's comparison scheme" are therefore two different mechanisms, and
naïvely doing both (binary-insertion *as the truth* **and** a percentile display **and**
Elo on top) is redundant — you maintain two rank sources that can disagree.

**The resolution:** keep **Elo as the single source of truth for position**, and use
**binary search only as the comparison-*selection* policy** — i.e. which pair to ask next
so the new venue lands in ~`log₂(n)` taps instead of `n`. Every answer is still a normal
Elo update, so misclicks self-correct, intransitive cycles (A>B>C>A) converge, and a
re-rate re-flows the ratings — none of which a pure binary-insertion list can do without
bolt-ons. This honors the explicit "ELO" ask, delivers Beli's few-taps UX, and has exactly
one ranking store.

**Scope tension (must be surfaced, not silently resolved):** the beta `ISA.md` ships
2026-06-30 (7 days out), demotes the ranked list to a derived view (unlocks at N≥5), and
marks **multi-city + recommendation explicitly OUT OF SCOPE**. So this ADR splits cleanly:
the **ranking-core fix is beta-aligned** (it *is* the "feels like *mine*" moment and it
kills the O(n²) compare UX a tester would hit), while the **suggestion engine is
post-beta** — designed now, with data captured now, built later.

## Decision

### 1. One source of truth: the existing Elo engine, evolved (not replaced)

Keep `lib/ranking.js` as the position authority. Make three changes:

1. **Seed the Elo prior from sentiment.** Instead of a flat 1500, a venue's starting
   rating is its band prior: `loved → 1650`, `fine → 1500`, `disliked → 1350` (tunable).
   The list is roughly ordered *before* any comparison, and comparisons refine within band.
2. **`too-tough` = a 0.5 draw, not a discard.** Both ratings move toward each other
   (`score = 0.5` for each side). This stops throwing away real signal.
   → `ranking.test.js`'s "too-tough leaves ratings unchanged" test inverts; update it.
3. **Export an incremental updater** (`updateRatings(prev, comparison)`) so a live
   binary-search placement session can apply one comparison at a time without a full
   batch recompute. The batch path stays for cold recomputation/migration.

Elo is **not** vestigial here: it is what produces the within-band ordering that the
display reads, it absorbs noisy/contradictory comparisons, and it gives a continuous
strength estimate that the post-beta suggestion layer consumes. Binary search never
becomes a competing store — it only chooses the next question.

### 2. Binary search is the comparison-*selection* policy (the Beli UX)

Replace `pickRandomPair` with a placement session driven off a **newly-logged venue**:

- When a venue is logged/rated, open a placement session scoped to its `cohort` **and**
  its sentiment **band**. Binary-search the new venue against the already-ranked venues
  *in that band only*: compare against the band's median, then the median of the
  surviving half, etc. ⇒ ~`log₂(band size)` taps (≈4–5 for 20 venues), not all pairs.
- Each tap writes a normal comparison and applies one incremental Elo update.
- **`too-tough` inside a placement search** = "you're adjacent here": stop narrowing and
  insert next to the current midpoint (and record the 0.5 draw). This is the only
  well-defined meaning of a tie in a search that must otherwise branch.
- **Re-rank escape hatch** = re-open a placement session for an existing venue. Free,
  because Elo simply absorbs the new comparisons. (This is why real Beli re-prompts over
  time, and it is the recovery path a pure binary-insertion list lacks.)
- **Abandon / cold-start:** a venue with no comparisons sits at its band prior, shown
  immediately with a "placing…" affordance; abandoning mid-session leaves it at the band
  midpoint, flagged `unplaced` for a later re-prompt. The first venue in a band *is* the
  midpoint.

### 3. Display is a stable 0–10, hard-clamped to the sentiment band

Map each venue's Elo to a **0–10 score** = band window + within-band rank percentile:

| Band | Score window |
|------|-------------|
| `loved` | 7.0 – 10.0 |
| `fine` | 5.0 – 6.9 |
| `disliked` | 0.0 – 4.9 |

Within a band, the venue's rank-percentile (over Elo ratings) sets the decimal. **Hard
clamp on display**: a `loved` venue can never render below a `fine` one, so the sentiment
promise the user made is never visually violated — the property that makes Beli's scores
feel honest. (The underlying cross-comparison Elo can still inform suggestions; the *clamp*
is a display rule only.) This replaces the raw `1532` shown today and slots straight into
`lib/feed-display.js` `getRatingBadge`, which already reads `score`/`personalScore`.

New pure helper `lib/scoring.js`: `toDisplayScore({ rating, band, bandPercentile }) → number`.

### 4. Capture the data for suggestions now; build the engine post-beta

The comparison log is the **only irreversible decision** here, so get its schema right on
day one. Each comparison persists: `userId`, `cohort`, `venueA`, `venueB`, `result`
(winner id | `too-tough`), **`band`/sentiment context**, `city`/`metro`, and `createdAt`.
(`app/compare.js` already writes most of this; add band/sentiment context.) This append-only
log is simultaneously the ranking input **and** the collaborative-filtering signal.

**Deferred 3-rung suggestion ladder (post-beta), ship rung 1 first:**

1. **Aggregate consensus (cold-start, works day 1 of the recs feature):** combine all
   users' per-venue Elo into a global quality score per `(metro, cohort)`; recommend
   high-consensus venues the user hasn't rated. No taste model needed.
2. **Pairwise-concordance taste similarity (collaborative):** two users are "similar" when
   their pairwise comparisons agree (concordant pairs / Kendall-τ over shared venues);
   recommend the top spots of the users most concordant with you. **This is the Beli
   "follow people with your taste" magic, and it is a free byproduct of the same taps that
   build the list** — ordinal concordance is a better, scale-bias-immune similarity metric
   than star-rating cosine. The strong loved-set membership is an additional cheap signal.
3. **Content/context boosters (last):** cohort affinity, neighborhood, companion overlap,
   `besttime` time-of-day — re-rank rungs 1–2. Kept a *booster* only, because venue data is
   sparse OSM (see venue-data constraints); it is not a foundation.

## Consequences

**Code changes (all in `lib/` first, per the project's "logic in lib/, test, then wire" rule):**

- `lib/ranking.js` — add `seedFromSentiment`; `too-tough` → 0.5 draw; export
  `updateRatings(prev, comparison)`.
- `lib/scoring.js` (new) — `toDisplayScore` band+percentile mapping; pure, unit-tested.
- `lib/compare-select.js` (new) — `nextComparison(newVenueId, rankedBand, band)` binary
  midpoint picker; replaces `pickRandomPair`.
- `lib/personal-rankings.js` — `personalScore` becomes the 0–10 display score, not raw Elo.
- `app/compare.js` — drive placement sessions off the freshly-logged venue; render 0–10.
- `lib/__tests__/ranking.test.js` — invert the too-tough test; add sentiment-seeding and
  draw-convergence cases. New tests for `scoring` and `compare-select`.
- (post-beta) `lib/suggestions.js` — `aggregateConsensus`, `tasteConcordance`.

**Wins:** kills O(n²) compare UX; honors the loved/fine/disliked promise on screen;
recognizable Beli-style scores; single ranking store; re-rank/misclick recovery for free;
suggestion data captured from day one.

**Costs / known properties:** rank-percentile means every score shifts slightly when a
venue is added/deleted/re-rated (a property, not a bug). Sentiment seeds are tunable
magic numbers. Within-band comparisons mean cross-band taste signal is thinner — the
post-beta suggestion layer leans on band membership (the loved set) plus within-band
concordance, which is sufficient.

## Alternatives considered

- **Pure Beli binary-insertion (insertion order = truth, no Elo).** Simplest, fewest
  parts (advisor's recommendation). **Rejected** because: (a) the owner explicitly asked
  for Elo; (b) it has no recovery from a misclick and no convergence on intransitive
  preferences without bolting on a re-insert log — i.e. you rebuild what Elo gives free;
  (c) the Elo engine already exists and is tested, so replacing it is *more* 7-day risk
  than evolving it.
- **Pure Elo with informative near-neighbor pairing (no binary framing).** Viable, but
  binary-search selection is the more legible "feels like Beli" UX and maps to the same
  Elo updates, so we keep the framing.
- **Hybrid where binary-insertion is *also* a truth source (the naïve reading).**
  Rejected as redundant per the advisor — two rank sources that can disagree. The chosen
  design avoids this by making binary search a *selection policy only*.

## Scope recommendation

Land **§1–§3 (ranking core + 0–10 display + binary-search selection)** as a small,
beta-aligned change if the 7-day window allows — it directly serves the beta's "feels like
*mine*" target and removes a UX wart testers would hit. Keep **§4 (suggestion engine)**
post-beta, but **add the band/sentiment context to the comparison schema now** so the data
is ready. Owner decides pre-vs-post-2026-06-30 sequencing.
