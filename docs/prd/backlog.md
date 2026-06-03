# Rounds Backlog

## Status

Current active slice: none. Last completed slice: Architecture hardening — Conversation Message send and Conversation surface (`00e8f43`, `ecd7ba7`). The Friends-first MVP track is implemented through text DMs, group chats, review companion tags, venue/review links, unlisted Rating shares, polls, photos, location pins, voice notes, safety basics, and message reactions/reply quotes.

No `current-slice.md` exists. Active work belongs in `AGENTS.md` plus `docs/agents/{slice}.md` once a slice is selected.

## Upcoming slices

| Priority | Slice | Description | Slice doc |
|---|---|---|---|
| 0 | Select next active slice | Choose one backlog item and create/confirm `docs/agents/{slice}.md` before code changes. | — |
| 1 | Manual Firebase emulator UI QA | Exercise completed Friends/feed/rating flows against local emulators before broader beta. | — |
| 2 | Poll rule hardening fast-follow | Enforce closed-poll vote denial and member-option append-only behavior in rules once the emulator/rules path is safe. | — |
| 3 | Voice-note lifecycle fast-follow | Add sender save behavior and per-listener post-play disappearance for temporary voice notes. | — |
| 4 | Rating privacy/share transitions | Add Rating visibility transitions plus Post projection create/delete and unlisted share revoke behavior. | — |
| 5 | Backend projection seams | Move feed, personal-ranking, chat notification, and sensitive message-send projections from client-owned writes toward backend-owned workers/functions. | — |
| 6 | Event recommendation data path | If selected, use ADR 001/002 constraints for Spotify genre vectors and self-hosted/Apify event sourcing. | — |

## Archived specs

- `docs/prd/archive/friends-tab.md` — implemented Friends-first behavior contract.
