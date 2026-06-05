# Rounds Backlog

## Status

Current active slice: none. Completed hardening slices for issue `docs/issues/0002-expo-standard-compliance-hardening.md`: Expo standard dependency doctor; Expo standard path aliases; Expo standard route layout insets; Expo standard navigation contract; Expo standard native tabs evaluation; Expo standard icon/platform/haptics; Expo standard audio adapter; Expo standard Feed view-model extraction. Last completed native UI slice: safe-area/header cleanup under issue `docs/issues/0001-native-ui-navigation-hardening.md`. Earlier completed slice: Native UI media adapter (`f26ad8a`, `0d8e0d6`, `dc49254`, `c76b8a4`, closed by `21d429c`). The Friends-first MVP track is implemented through text DMs, group chats, review companion tags, venue/review links, unlisted Rating shares, polls, photos, location pins, voice notes, safety basics, and message reactions/reply quotes.

No `current-slice.md` exists. Active work belongs in `AGENTS.md` plus `docs/agents/{slice}.md`.

## Upcoming slices

| Priority | Slice | Description | Slice doc |
|---|---|---|---|
| 0 | Select next Expo standard slice | Recommended next: Friends/conversation view-model extraction from issue `docs/issues/0002-expo-standard-compliance-hardening.md`; create/confirm `docs/agents/{slice}.md` before code changes. | — |
| 1 | Manual Firebase emulator UI QA | Exercise completed Friends/feed/rating flows against local emulators before broader beta. | — |
| 3 | Poll rule hardening fast-follow | Enforce closed-poll vote denial and member-option append-only behavior in rules once the emulator/rules path is safe. | — |
| 4 | Voice-note lifecycle fast-follow | Add sender save behavior and per-listener post-play disappearance for temporary voice notes. | — |
| 5 | Rating privacy/share transitions | Add Rating visibility transitions plus Post projection create/delete and unlisted share revoke behavior. | — |
| 6 | Backend projection seams | Move feed, personal-ranking, chat notification, and sensitive message-send projections from client-owned writes toward backend-owned workers/functions. | — |
| 7 | Event recommendation data path | If selected, use ADR 001/002 constraints for Spotify genre vectors and self-hosted/Apify event sourcing. | — |

## Archived specs

- `docs/prd/archive/friends-tab.md` — implemented Friends-first behavior contract.
