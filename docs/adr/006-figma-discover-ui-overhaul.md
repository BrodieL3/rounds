STATUS: ACTIVE — agents must read before touching tab navigation, Discover/Feed, Plus menu, auth/onboarding frontend, or Figma UI overhaul work.

> **Amendment (2026-06-30):** the "Expo Go remains the first sanity-check path" assumption below did not hold — native modules (maps, camera) forced a move to the EAS `ios-simulator` dev client (`eas.json`). Nothing else in this ADR's Discover/Friends/Plus decision changed. Current runtime guidance lives in `CLAUDE.md`.

# ADR 006: Figma Discover UI Overhaul

## Status
Accepted

## Context

The Figma file `Rounds` (`8CcbpAdt4AMYS9hulRy15n`) defines a sparse, icon-forward mobile UI with five primary surfaces: Friends, Discover, Plus Menu, My List, and Profile, plus a Chat state. This direction supersedes the prior user-facing `Feed` tab label from ADR 003 while preserving Friends as the hero surface.

The current codebase is Expo SDK 54 and should stay SDK 54 for this overhaul so Expo Go remains the first sanity-check path. The existing auth/onboarding frontend is intentionally not part of the Figma rebuild; auth plans will be handled separately.

## Decision

Use the Figma visual language as the source for the next frontend rebuild:

- Primary nav surfaces: Friends, Discover, Plus, My List, Profile.
- Discover replaces the current Feed surface in product language. Existing public `posts`/feed view-model data may be reused as placeholder or interim backing data until Discover behavior is specified deeper.
- Use Figma colors: background `#F0F0F0`, hero/accent `#084EB8`, text `#111827`, placeholder gray `#D9D9D9`, secondary grays `#A0A0A0` and `#B9B9B9`.
- Use a modern system sans-serif unless a bundled font is explicitly selected later; do not block implementation on LINE Seed JP.
- Plus Menu opens as a drawer/sheet from any primary surface and offers three actions: create group chat, rate a venue, create a post.
- Blank Figma spaces should be filled with placeholders using existing data where the eventual data role is clear; leave areas empty where unsure.
- Chat should use the real Apple/native keyboard. Sendable extensions such as images, polls, reviews, GIFs, and related chat attachments replace the keyboard area and consume the same vertical space.
- Keep Expo SDK 54 and Expo Go-first verification.
- Remove/rebuild frontend auth/onboarding for this UI pass; future auth work is separate.

## Consequences

- ADR 003 remains active for Friends-first direction and removal of Leaderboard/Rank, but its `Feed` tab wording is superseded by Discover.
- Code may retain legacy `feed` file/module names temporarily during the rebuild, but user-facing UI and new docs should say Discover.
- Firebase domain seams remain: Friends/social data behind `lib/friends/**`, Rating/Post identity per ADR 005, group membership grants per ADR 004.
- Tests should assert Discover labels and Figma tokens before route purge.
- Existing auth routing docs/code may be deleted or simplified by the overhaul, but Firebase wiring must still work at the end through new or retained seams.
