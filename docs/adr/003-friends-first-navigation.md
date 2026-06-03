STATUS: ACTIVE — agents must read before touching tab navigation, Friends, Feed, List, Profile, or ranking surfaces.

# ADR 003: Friends-First Navigation and Social Planning

## Status
Accepted

## Context
Rounds originally had a tab layout centered on Feed, List, Add, Rank, and Profile. The Rank/Leaderboard tab was still a placeholder; ranking existed only as local personal pairwise comparison logic.

The product direction has shifted toward helping users coordinate nights out with people they actually plan with. Feed remains useful for seeing friend/followed activity, but it is not the core planning surface. A global or city leaderboard does not currently support the strongest near-term use case.

## Decision
Replace the unimplemented Leaderboard/Rank tab with a Friends-first planning model.

Planned tab order:
1. Friends
2. Feed
3. Add
4. List
5. Profile

Friends becomes the hero tab. It is an inbox-first surface for direct messages, group chats, planning attachments, polls, venue/review links, and review companion selection.

Leaderboard/Rank is removed from primary navigation. Personal ranking remains available through comparison/ranking features, but there is no near-term leaderboard surface.

## Consequences
- Chat, Friendship, group chat, blocking, reporting, notifications, and unlisted review sharing become first-class product concerns.
- Feed remains the place for public friend/followed activity.
- List remains the venue discovery/rating entry point.
- Ranking work should focus on personal rankings and cohort-consistent comparison rather than public leaderboards.
- Backend seams and Firestore rules must account for sensitive social planning state instead of treating social state as screen-local client logic.
