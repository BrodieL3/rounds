# Rounds Context Map

## Status
Current guide for agent context loading. Read this before choosing which project docs to trust.

## How to use this map

1. Start with the current-source docs below.
2. Read ADRs only when they touch the area you are changing.
3. Treat handoffs as session state, not durable product truth.
4. If a doc is not listed here, treat it as reference until you verify it against current-source docs.

## Current sources of truth

- `CONTEXT.md` — domain vocabulary and product priorities. Glossary only; do not use it as an implementation spec.
- `docs/prd/friends-tab.md` — detailed Friends product behavior source of truth.
- `docs/prd/current-to-desired-state.md` — implementation roadmap, slice order, current-slice tracker, and slice-specific implementation notes.
- `docs/adr/` — durable architectural decisions. Read relevant ADRs before changing matching areas.
- `docs/agents/` — project-specific workflow instructions for domain docs, issue tracking, and triage labels.

## ADR index

- `docs/adr/001-api-capabilities-synthesis.md` — validated API/data capability findings for venue/event/data layers.
- `docs/adr/002-eventbrite-alternative-assessment.md` — event API alternatives and Eventbrite limitations.
- `docs/adr/003-friends-first-navigation.md` — accepted Friends-first tab/navigation direction.
- `docs/adr/004-trusted-group-creation-boundary.md` — trusted Cloud Function boundary for group membership grants.
- `docs/adr/005-rating-canonical-opinion-and-public-projection.md` — Rating as canonical opinion identity, Posts as public projections, and media paths over persisted download URLs.

## Secondary reference

- `docs/dev-practices.md` — development practice notes. Use alongside global TDD instructions.
- Latest relevant `/tmp/rounds-*-handoff.md` file — session state only. Read after current docs, then verify against committed docs/code.

## Removed stale context

These files were intentionally removed because they duplicated or conflicted with current sources:

- `MISSION.md` — superseded by `CONTEXT.md` plus current PRDs.
- `GLOSSARY.md` — superseded by `CONTEXT.md` canonical vocabulary.
- `docs/expo-docs.md` — stale local Expo snapshot; use versioned Expo docs per repo instruction.
- Older `/tmp/rounds-*-handoff.md` files — stale session summaries after their work was committed.

## Latest handoff pattern

Handoffs live in `/tmp`, not the repo. Keep only the latest relevant handoff, such as `/tmp/rounds-group-lifecycle-slice-4b-handoff.md`.

Do not treat handoffs as source of truth after their changes are committed. Prefer commit history and current docs.

## Agent startup checklist

When starting a new Rounds session:

1. Read this file.
2. Read `CONTEXT.md`.
3. Read `docs/prd/current-to-desired-state.md`.
4. Read `docs/prd/friends-tab.md` if working on Friends.
5. Read relevant ADRs.
6. Run `git log --oneline -5`.
7. Run `git status --short`.
8. Find the latest relevant `/tmp/rounds-*-handoff.md` if continuing recent work.
9. Report current slice, next likely slice, relevant decisions, and dirty-worktree risk before editing.

## End-of-slice checklist

Before handing off a slice:

1. Update `docs/prd/current-to-desired-state.md` if the slice scope/current tracker changed.
2. Add or update ADRs only for durable, hard-to-reverse tradeoff decisions.
3. Keep `CONTEXT.md` glossary-only; add terms only when domain language changes.
4. Run relevant tests/builds and record exact commands in the handoff.
5. Commit and push if requested.
6. Write `/tmp/rounds-[slice]-handoff.md` with commit hash, changed areas, verification, and next recommended work.
7. Update this map if a new durable context doc becomes a source of truth.
