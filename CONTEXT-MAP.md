# Rounds Context Map

## Status

Minimal bootstrap pointer for agent context loading. `AGENTS.md` is the dispatch table; this file only tells agents where to start and which docs are durable.

## Agent startup order

1. `AGENTS.md` — find your slice and cross-cutting rules.
2. `docs/agents/{your-slice}.md` — scope, done criteria, sharp edges. If no slice doc exists, stop and confirm/create one before code changes.
3. `CONTEXT.md` — domain term clarification only.
4. ACTIVE ADRs relevant to your slice only.
5. `git log --oneline -5` and `git status --short`.

## Durable sources

- `AGENTS.md` — active-slice dispatch index and rules every agent follows.
- `docs/agents/{slice}.md` — only slice-specific briefing a slice agent must read.
- `CONTEXT.md` — stable domain vocabulary and canonical domain distinctions only.
- `docs/adr/` — durable decisions; read ACTIVE ADRs only when they touch your work area.
- `docs/prd/backlog.md` — upcoming slices; not an active-slice briefing.
- `docs/prd/archive/` — implemented specs and historical product contracts.
- `docs/agents/issue-tracker.md` — local markdown issue tracker workflow.

## ADR index

- `docs/adr/001-api-capabilities-synthesis.md` — API/data capability findings for venue/event/recommendation layers.
- `docs/adr/002-eventbrite-alternative-assessment.md` — event API alternatives and Eventbrite limitations.
- `docs/adr/003-friends-first-navigation.md` — Friends-first tab/navigation direction.
- `docs/adr/004-trusted-group-creation-boundary.md` — trusted Cloud Function boundary for group membership grants.
- `docs/adr/005-rating-canonical-opinion-and-public-projection.md` — Rating identity, Post projection, and media-path rules.
- `docs/adr/006-figma-discover-ui-overhaul.md` — Figma UI overhaul, Discover replacing Feed product language, Plus menu actions, SDK 54 target. **Expo Go-first verification assumption no longer holds — dev runs on the EAS `ios-simulator` dev client; see CLAUDE.md.**
- `docs/adr/007-location-is-a-venue-property.md` — location is a venue property; metro is the lens; beta = Boston+Cambridge catalog.
- `docs/adr/008-personal-ranking-elo-banded-with-binary-search-selection.md` — Tier A personal ranking: sentiment-banded Elo + binary-search selection + 0–10 banded display. **§1 superseded by ADR 010; §2/§3 still current.**
- `docs/adr/009-global-per-cohort-ranking-bradley-terry-conservative-bound.md` — Tier B global ranking: per-cohort Bradley-Terry posterior, conservative lower bound, one-directional firewall (Tier B never writes Tier A); designed-not-built.
- `docs/adr/010-personal-ranking-per-user-bradley-terry.md` — Tier A moves to per-user Bayesian Bradley-Terry ranked by lower bound; one-tap Stop decoupled from Rating; supersedes ADR 008 §1, preserves §2/§3, reaffirms ADR 009 firewall.

## Trust rules

- Handoffs in `/tmp` are session state only; read them after durable docs, then verify against commits/code.
- If multiple candidate slices appear active, list candidates and stop instead of guessing.
- Do not invent done criteria. Use `TODO: [owner to fill in]` until confirmed.
- Preserve `CONTEXT.md` as domain vocabulary only; implementation notes belong in slice docs, ADRs, or PRDs.

## End-of-slice checklist

1. Update the slice doc if scope, done criteria, or sharp edges changed.
2. Update `docs/prd/backlog.md` when slice status or next-slice order changes.
3. Add/update ADRs only for durable, hard-to-reverse decisions.
4. Run relevant tests/builds and record exact commands in handoff.
5. Commit/push if requested.
6. Write `/tmp/rounds-[slice]-handoff.md` with commit hash, changed areas, verification, and recommended next work.
