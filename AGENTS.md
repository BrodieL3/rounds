# Agent Dispatch Index

| Active slice | Slice doc | Files in scope | Status |
|---|---|---|---|
| None | — | — | Expo standard compliance slices completed through Feed view-model extraction; choose next slice (Friends/conversation VM extraction recommended) before editing. |

## Cross-cutting rules

- Use TDD: write/update tests first, confirm red, implement minimal green, refactor after green.
- Read Expo SDK 56 docs before Expo code: https://docs.expo.dev/versions/v56.0.0/
- Keep business logic out of route screens; use pure/service seams under `lib/**`, adapters at edges.
- Firestore/Storage access stays behind service seams; sensitive social mutations use trusted Functions where ADRs require.
- Canonical opinions are `ratings/{ratingId}`; public projections are `posts/{ratingId}`; review links use `ratingId`.
- Friends/private planning state stays membership-gated; group membership grants follow ADR 004.
- Naming: `userId` on Rating/Post owner fields; `*Uid` in Friends/social docs; deterministic ids where contracts define them.
- Cohort isolation must hold across venue lists, Ratings, Comparisons, Personal Ranking.
- Issues/PRDs use local markdown files in `docs/issues/`; see `docs/agents/issue-tracker.md`.

## How to use

Start here. If assigned a slice, read its `docs/agents/{slice}.md`; if none exists, stop and create/confirm one. Then read `CONTEXT.md` only for domain terms, ACTIVE ADRs relevant to your files, and latest git state.
