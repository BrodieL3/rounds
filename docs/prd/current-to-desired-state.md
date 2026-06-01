# Rounds Current-to-Desired State PRD

## Status
Draft synthesized from current app screenshots, `CONTEXT.md`, ADRs, existing Friends PRD, and `/tmp` handoffs.

## Problem Statement
Rounds has a coherent mobile shell for a friends-first nightlife app: Friends, Feed, Add, List, and Profile now visually match the desired direction. The app still behaves like a client-owned prototype: Friends is an empty inbox, social planning state is missing, feed/list/profile actions are shallow, and sensitive social data has no backend seam or security model.

Users need Rounds to move from a good-looking venue/rating prototype into a usable friends-first planning app where they can become friends, message, share venues/reviews, plan in groups, and keep their personal rankings separate from public discovery.

## Solution
Ship a beta-ready friends-first MVP that preserves the current visual direction shown in the screenshots while adding the product behavior defined in the context files:

- Friends becomes the functional hero surface: friend requests, private Friendships, DMs, group chats, inbox previews, and chat creation.
- Feed remains city/followed activity: ratings create posts, posts support likes/comments/shares/bookmarks, and followed users are promoted.
- Add remains the fast review entry point: search a visited venue, rate it, add media, optionally tag companions, and publish/share appropriately.
- List remains venue discovery and ranking context: city search, cohort filters, venue detail, and personal ranking signals stay cohort-consistent.
- Profile shows public identity plus private personal list: followers/following remain public; friend list/count remains private; personal list only shows ranked venues from comparisons.
- Backend seams and Firestore rules protect Friends, messages, blocks, unlisted review shares, and ranking/feed projections.

## Current State Audit From Screenshots

1. Friends screen already has desired empty-state shell: title, planning subtitle, create-chat button, friend-request card, Inbox section, and empty conversation card.
2. Feed screen already shows rating-derived activity posts with avatar, venue/cohort/neighborhood/time metadata, photos, notes, likes/bookmarks counts, and action icons.
3. List screen already shows city title, venue search, cohort chips, numbered venue rows, metadata, open/closed status, and rank/privacy icon affordances.
4. Profile screen already shows identity, share/menu actions, follower/following stats, locked rank status, edit/share actions, and `Your list` ranked from comparisons.
5. Venue detail already shows Google Places-style venue metadata: cohort badge, price, address/maps, rating/review count, tags, hours, rate CTA, and miscategorization report.
6. Add flow already opens as a rate-place search surface with keyboard, venue rows, plus/bookmark/dismiss affordances, and path to review creation.

## Desired Behavior Gap

1. Friends has no real friend requests, Friendships, chat creation, inbox data, messages, group chats, or permissions.
2. User profiles support Follow but not Add Friend / Requested / Respond / Friends / Message states.
3. Feed action icons are partly cosmetic and need direct like/comment/share/bookmark/add-to-list behavior.
4. Review creation does not support companion tags, unlisted sharing, review links, or privacy controls.
5. Group chat, polls, venue links, review links, photos, voice notes, one-time location pins, reactions, replies, and hidden/deleted message states are not implemented.
6. Firestore rules do not yet protect conversation membership, private Friendships, blocks, unlisted review shares, or self-only personal comparisons.
7. Chat/feed/ranking logic still needs deeper service modules instead of screen-owned business logic.

## User Stories

1. As a signed-in user, I want Friends to be my default landing tab, so that planning with people is the core app experience.
2. As a user with no chats, I want a clear empty inbox, so that I know to add friends and start a DM or group chat.
3. As a user, I want to send a friend request from profile/search/Friends, so that I can form private planning relationships.
4. As a user, I want to accept or decline incoming friend requests, so that I control who can message me.
5. As a user, I want accepted Friendships to auto-create mutual follows, so that friend activity appears in Feed.
6. As a user, I want removing a Friend to leave follows intact, so that friendship and feed visibility remain separate.
7. As a user, I want one canonical DM per Friend pair, so that my chat history is not duplicated.
8. As a user, I want to create group chats with Friends, so that I can plan nights with multiple people.
9. As a group admin, I want to name a group and manage members, so that the chat has a clear identity.
10. As a user, I want the inbox sorted by latest visible message, so that active plans are easy to resume.
11. As a user, I want previews for text, photos, polls, voice notes, locations, venues, and reviews, so that I understand chat context from the inbox.
12. As a user, I want to send text messages, so that basic planning works first.
13. As a user, I want message reactions and reply quotes, so that lightweight chat context works without threads.
14. As a user, I want to share a venue into chat, so that friends can discuss where to go.
15. As a user, I want to share a public review into chat, so that friends can use real opinions to decide.
16. As a review author, I want to share a private Rating as an unlisted review link, so that I can show it only to a conversation.
17. As a user, I want polls in group chat, so that the group can decide where or when to go.
18. As a user, I want to share photos, voice notes, and one-time location pins, so that planning feels natural.
19. As a user, I want temporary voice notes by default, so that casual planning audio does not live forever unless saved.
20. As a user, I want to hide or delete messages appropriately, so that I can manage my chat history.
21. As a user, I want to block another user, so that they cannot message, request, invite, tag, or comment at me.
22. As a user, I want to report users/messages/groups/review tags, so that beta safety issues can be handled.
23. As a user, I want Feed to show followed users above city activity, so that friends feel more relevant than strangers.
24. As a user, I want to like and comment from posts, so that social activity is interactive.
25. As a user, I want bookmark/want-to-try actions, so that places can be saved without being ranked.
26. As a user, I want Add to quickly find a venue I visited, so that recording a Rating is low-friction.
27. As a user, I want Ratings to create public Posts by default, so that my activity can appear in Feed.
28. As a user, I want to tag review companions, so that nights out connect to people I went with.
29. As a tagged user, I want to remove myself and block future tags from an author, so that tags stay consent-respectful.
30. As a user, I want List to search/filter venues by city and Cohort, so that comparisons stay peer-cohort isolated.
31. As a user, I want venue detail metadata before rating, so that I know I picked the right place.
32. As a user, I want pairwise comparison only within a Cohort, so that Personal Ranking remains meaningful.
33. As a user, I want Profile `Your list` to include only personally ranked venues, so that recommendations do not pollute my list.
34. As another user viewing my profile, I want follower/following counts but not friend count/list, so that Friendship remains private.
35. As a developer, I want Friends/feed/ranking behind service seams, so that screens stay thin and behavior can be tested.
36. As a developer, I want security rules/function tests for social planning state, so that private chat and unlisted reviews cannot leak.

## Implementation Decisions

1. Preserve current five-tab order: Friends, Feed, Add, List, Profile.
2. Keep Leaderboard/Rank out of primary navigation. Personal Ranking remains accessible through comparison/list/profile behavior.
3. Treat current screenshots as visual acceptance baseline for early beta shell; behavior work should not regress layout, tab order, empty states, or venue row language.
4. Build Friends in vertical slices:
   - empty inbox and nav polish;
   - friend requests and Friendship;
   - text-only DM and inbox;
   - text-only group chat;
   - review companion tagging;
   - venue/review links;
   - polls;
   - photos;
   - voice notes;
   - one-time location pins;
   - reporting, blocking, notifications, and rule hardening.
5. Keep Friendship separate from Follow. Accepting a Friend Request creates mutual follows; removing Friendship does not remove follows.
6. Gate DM creation and group invites on Friendship, not following.
7. Use one canonical direct-message thread per user pair.
8. Limit MVP group chats to 25 members and exactly one admin.
9. Keep Feed as public/followed activity, not planning. Planning belongs in Friends.
10. Keep List as venue discovery plus personal ranking context. Profile `Your list` must filter out unranked discovery venues.
11. Keep Cohort as the isolation key across Ratings, Comparisons, List filtering, and Personal Ranking.
12. Rating creation continues to create both a private Rating and public Post, then expands to companion tags and unlisted sharing.
13. Review companion tags store user tags, not group chat identity; group chat selection is only a shortcut.
14. Unlisted private rating access is granted per conversation and revoked when access is removed.
15. Move sensitive mutations toward trusted backend boundaries: friend accept, group membership, message send, delete-for-everyone, private share grant/revoke, block, and report.
16. Add canonical collections for friend requests, friendships, blocks, conversations, conversation members/messages, per-user conversation states, notifications, and rating shares.
17. Harden existing public reads: comparisons and private planning state should not be globally readable in beta.
18. Keep Google Places/static venue seed as MVP venue catalog; do not prioritize event scraping or booking until core social planning works.

## Testing Decisions

1. Tests should assert external behavior and data contracts, not component internals.
2. Add pure module tests for Friends state machines: request status, Friendship derivation, DM key generation, group membership rules, inbox preview formatting, hidden/deleted conversation behavior.
3. Add service tests for permission decisions: non-friend DM denial, duplicate request prevention, inverse request acceptance, group cap, admin transfer, block effects.
4. Add rule/function tests for private data: non-member cannot read conversations/messages; unlisted ratings require active conversation membership; blocked users cannot request/message/invite/tag/comment.
5. Extend feed tests for sorting followed activity above city activity, preview counts, and display formatting.
6. Extend ranking/list/profile tests for Cohort isolation, `too-tough` handling, and profile personal-list exclusion of unranked venues.
7. Add review tests for Rating/Post dual write payload shape, companion tags, unlisted share grants, and tag-removal constraints.
8. Keep UI tests focused on stable visible copy and navigation affordances matching screenshot baseline.

## Out of Scope

- Public leaderboard/rank tab.
- Production-grade booking/table reservations.
- Event recommendation UI and RA/Posh/Eventbrite scraping work.
- Geofenced live crowd reporting.
- Continuous live location sharing.
- Video attachments, payments, and generic files.
- Message editing and threaded conversations.
- Phone contact sync, QR/link invites, and mutual friend indicators.
- Formal moderation dashboard for first beta, though reports must be preserved.

## Implementation Strategy

Implement as serial vertical slices, not one monolithic agent task. The feature crosses chat, Firestore rules, feed, profile, ranking, review sharing, safety, and auth-adjacent social state; a monolith is too risky and hard to review.

Current slice in development: 2. Friendship slice.

Update this line whenever work starts on a new slice, and update that slice's implementation instructions before coding.

Recommended agent task sequence:

1. Foundation agent
   - Lock PRD scope as contract-only behavior. Do not add UI behavior, Firebase writes, Cloud Functions, or Firestore rules in this slice.
   - Define canonical Firestore document shapes in code and PRD notes for `friendRequests`, `friendships`, `blocks`, `conversations`, conversation `members`, conversation `messages`, per-user `conversationStates`, notifications, and `ratings/{ratingId}/shares`.
   - Create pure `lib/friends/*` service seams with no Firebase imports: contracts, ID builders, request/Friendship status derivation, permission checks, group membership rules, and inbox preview/visibility formatting.
   - Use deterministic IDs where appropriate: `friendships/{minUid}_${maxUid}`, `conversations/dm_{minUid}_{maxUid}`, directional `friendRequests/{fromUid}_{toUid}`, and directional `blocks/{blockerUid}_{blockedUid}`.
   - Encode agreed invariants: inverse pending request becomes `Respond`, block state wins over all social permissions, DMs require Friendship, group chats are capped at 25 members, active groups have exactly one admin, and an archived empty group may have no active admin.
   - Add pure Jest tests for contracts, ID builders, request status matrix, permission matrix, group rules, hidden inbox visibility, and preview labels. Do not add emulator/rules tests yet; introduce those with the slices that first need enforceable rules.

   Foundation Firestore contract notes:
   - `friendRequests/{fromUid}_{toUid}` fields: `fromUid`, `toUid`, `status: pending|accepted|declined|canceled`, `createdAt`, `respondedAt`.
   - `friendships/{minUid}_{maxUid}` fields: `memberUids`, `createdAt`, `createdFromRequestId`.
   - `blocks/{blockerUid}_{blockedUid}` fields: `blockerUid`, `blockedUid`, `createdAt`.
   - `conversations/{conversationId}` fields: `type: dm|group`, `memberUids`, `adminUid?`, `name?`, `photoUrl?`, `createdAt`, `lastMessageAt?`, `archivedAt?`.
   - `conversations/{conversationId}/members/{uid}` fields: `uid`, `role: admin|member`, `joinedAt`, `leftAt?`.
   - `conversations/{conversationId}/messages/{messageId}` fields: `senderUid`, `type`, `text?`, `createdAt`, `deletedForEveryoneAt?`.
   - `users/{uid}/conversationStates/{conversationId}` fields: `hiddenAt?`, `deletedForSelfAt?`, `lastSeenAt?`.
   - `users/{uid}/notifications/{notificationId}` fields: `type`, `actorUid?`, `conversationId?`, `createdAt`, `readAt?`.
   - `ratings/{ratingId}/shares/{conversationId}` fields: `conversationId`, `sharedByUid`, `createdAt`, `revokedAt?`.
   - Timestamp fields are semantic server-write times in the contract; pure modules accept comparable values in tests and adapters later map to Firestore timestamps.
2. Friendship slice
   - Implement Firestore client writes behind `lib/friends/friendship-service.js`; do not introduce Cloud Functions in this slice.
   - Support Profile-screen Friend Request lifecycle: `Add Friend`, `Requested`, `Respond`, `Friends`, and `Message` placeholder states.
   - Support creating outgoing requests, canceling outgoing pending requests, accepting incoming requests, and declining incoming requests. Do not delete request docs; use `canceled` and `declined` terminal statuses.
   - Treat inverse pending request as `Respond`; do not create duplicate inverse requests.
   - Accepting a Friend Request must use one batch where possible: mark request `accepted`, create `friendships/{minUid}_{maxUid}`, update existing `users/{uid}.following[]` / `followers[]` arrays for mutual follow, and create a `friend_request_accepted` notification for the requester.
   - Sending a Friend Request creates `friendRequests/{fromUid}_{toUid}` and a `friend_request_received` notification for the recipient.
   - Keep Friendship separate from Follow in UI: retain Follow/Following button and add separate Friend CTA. Public follower/following stats remain; friend count/list stays private.
   - Friends tab request card subscribes to incoming pending requests, shows a pending count, expands in place, and lets the recipient accept or decline. Outgoing requests are not shown on Friends tab in this slice.
   - Defer Search quick-action buttons; search results continue to open Profile where Friend CTA exists.
   - Defer remove-friend behavior; `Friends` state is informational and `Message` remains a placeholder until the DM slice.
   - Add minimal Firestore rules and emulator-backed tests for `friendRequests`, `friendships`, and limited follow-array updates needed by accepted Friendship. Normal Jest remains separate from `npm run test:rules`.
   - Disable buttons while mutating; show alerts for failures; avoid optimistic status changes until writes succeed.
3. DM slice
   - Canonical direct-message thread.
   - Text messages.
   - Inbox previews.
   - Hidden/read state basics.
   - Initial conversation/message security rules.
4. Group chat slice
   - Create group.
   - Add Friends only.
   - Admin rules.
   - Leave/remove members.
   - 25 member cap.
5. Review/social planning slice
   - Venue links.
   - Review links.
   - Review companion tagging.
   - Unlisted private rating shares.
6. Feed/List/Profile polish slice
   - Real Feed actions.
   - Bookmark / want-to-try behavior.
   - Confirm Profile personal list excludes discovery rows.
   - Cohort isolation regression tests.
7. Safety slice
   - Block.
   - Report.
   - Delete/hide messages.
   - Notification privacy basics.
8. Rich attachment slices
   - Polls.
   - Photos.
   - Voice notes.
   - One-time location pins.

Execution rule: one agent owns one slice, writes/updates tests, runs relevant suite, then leaves a handoff. Merge or reconcile each slice before starting the next dependent slice. Parallel work should wait until DM/group foundations and shared Firestore contracts are stable.

## Further Notes

- Existing `docs/prd/friends-tab.md` remains source of truth for detailed Friends behavior.
- ADR 003 is accepted: Friends-first navigation is not optional.
- Existing `/tmp` handoffs confirm next build path should start with functional Friends slice #1 and preserve current uncommitted work cautiously.
- Expo package currently indicates SDK 54, while project instructions mention SDK 56 docs before Expo changes; resolve before implementation work.
