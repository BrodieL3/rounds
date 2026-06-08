STATUS: ACTIVE — agents must read before touching tab navigation, Friends, Discover/Feed, List, Profile, or ranking surfaces. Amended by ADR 006 for Figma Discover UI language.

# ADR 003: Friends-First Navigation and Social Planning

## Status
Accepted

## Context
Rounds originally had a tab layout centered on Feed, List, Add, Rank, and Profile. The Rank/Leaderboard tab was still a placeholder; ranking existed only as local personal pairwise comparison logic.

The product direction has shifted toward helping users coordinate nights out with people they actually plan with. Feed remains useful for seeing friend/followed activity, but it is not the core planning surface. A global or city leaderboard does not currently support the strongest near-term use case.

## Decision
Replace the unimplemented Leaderboard/Rank tab with a Friends-first planning model.

Original planned tab order:
1. Friends
2. Feed
3. Add
4. List
5. Profile

ADR 006 supersedes the user-facing `Feed` label with `Discover` for the Figma UI overhaul while preserving Friends-first navigation.

Friends becomes the hero tab. It is an inbox-first surface for direct messages, group chats, planning attachments, polls, venue/review links, and review companion selection.

Leaderboard/Rank is removed from primary navigation. Personal ranking remains available through comparison/ranking features, but there is no near-term leaderboard surface.

## Consequences
- Chat, Friendship, group chat, blocking, reporting, notifications, and unlisted review sharing become first-class product concerns.
- Feed/Discover remains the place for public friend/followed activity; new user-facing UI should say Discover per ADR 006.
- List remains the venue discovery/rating entry point.
- Ranking work should focus on personal rankings and cohort-consistent comparison rather than public leaderboards.
- Backend seams and Firestore rules must account for sensitive social planning state instead of treating social state as screen-local client logic.
