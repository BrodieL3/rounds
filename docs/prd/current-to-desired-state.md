# Rounds Current-to-Desired State PRD

## Status
Current implementation roadmap and slice tracker for moving Rounds toward the Friends-first MVP. Product behavior details still defer to `docs/prd/friends-tab.md`; domain language defers to `CONTEXT.md`.

## Problem Statement
Rounds has a coherent mobile shell for a friends-first nightlife app: Friends, Feed, Add, List, and Profile now visually match the desired direction. The app still behaves like a client-owned prototype: Friends is an empty inbox, social planning state is missing, feed/list/profile actions are shallow, and sensitive social data has no backend seam or security model.

Users need Rounds to move from a good-looking venue/rating prototype into a usable friends-first planning app where they can become friends, message, share venues/reviews, plan in groups, and keep their personal rankings separate from public discovery.

## Solution
Ship a beta-ready friends-first MVP that preserves the current visual direction shown in the screenshots while adding the product behavior defined in the context files:

- Friends becomes the functional hero surface: friend requests, private Friendships, DMs, group chats, inbox previews, and chat creation.
- Feed remains city/followed activity: public Ratings project into feed/public review surfaces, those projections support likes/comments/shares/bookmarks, and followed users are promoted.
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
27. As a user, I want new Ratings to be public by default and appear in Feed, so that my activity can be discovered without duplicating the opinion object.
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
12. Rating is the canonical opinion object; public feed/review surfaces are derived projections keyed by `ratingId`, not parallel opinion records.
13. Review companion tags store user tags on the Rating, not group chat identity; group chat selection is only a shortcut.
14. Unlisted private Rating access is granted per conversation and revoked when access is removed.
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
7. Add review tests for canonical Rating payload shape, public projection behavior, companion tags, unlisted share grants, and tag-removal constraints.
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

Current slice in development: none. Last completed slice: 8d. Unlisted private Rating shares. Next likely slice: 9. Feed/List/Profile polish.

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
   - `conversations/{conversationId}` fields: `type: dm|group`, `memberUids`, `adminUid?`, `name?`, `photoUrl?`, `createdAt`, `createdByUid?`, `lastMessageAt?`, `lastMessage?`, `archivedAt?`.
   - `conversations/{conversationId}/members/{uid}` fields: `uid`, `role: admin|member`, `joinedAt`, `leftAt?`, `invitedByUid?`.
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
   - Implement text-only direct messages behind `lib/friends/dm-service.js`; do not introduce group chat, attachments, reactions, replies, delete-for-everyone, or Cloud Functions in this slice.
   - Keep canonical direct-message ID as `dm_{minUid}_{maxUid}`. Tapping `Message` navigates to `app/conversation/[id].js` with `otherUid`, but does not create Firestore docs yet.
   - First text message creates the canonical conversation in one batch: `conversations/{dmId}`, both `members/{uid}` docs, first `messages/{messageId}` doc, both `conversationStates/{dmId}` docs, and a `new_direct_message` notification for the recipient.
   - Subsequent text messages update `lastMessageAt` and `lastMessage`, create a new message doc, update sender read/hidden state, and create a recipient notification.
   - Conversation doc fields for DM: `type: dm`, sorted `memberUids`, `createdAt`, `createdByUid`, `lastMessageAt`, and `lastMessage` with `id`, `senderUid`, `type: text`, `text`, and `createdAt`.
   - DM member docs use `role: member`, `joinedAt`, and `leftAt: null`; there is no admin for DM.
   - Text messages trim whitespace, reject empty text, and cap at 2000 characters. Message docs include `senderUid`, `type: text`, `text`, `createdAt`, and `deletedForEveryoneAt: null`.
   - On first send, sender conversation state gets `lastSeenAt` and `hiddenAt: null`; recipient state exists with `hiddenAt: null` and no visible read state. Opening a chat updates current user's `lastSeenAt`.
   - Friends inbox subscribes to current user's conversations with `memberUids array-contains uid`, filters hidden conversations client-side, sorts by `lastMessageAt`, fetches the other user for DM display, and shows text previews using the existing inbox formatter.
   - Add a simple inbox Hide action that sets current user's `hiddenAt`; hidden conversations reappear when `lastMessageAt > hiddenAt`.
   - Profile `Message` CTA navigates to the DM route only for Friends. Friends tab plus/create-chat button remains a placeholder until the group/create-chat slice.
   - Add Firestore rules and emulator-backed tests for DM conversation creation, member/message reads, text message sends, non-friend denial, non-member denial, conversation state writes, and hide/read state updates.
   - Keep read state storage only; visible `Seen` labels and unread indicators are deferred.
4. Group chat slice 4a: group create, text, and inbox
   - Create group conversation immediately from Friends `+`, before any message is sent.
   - Use a callable Cloud Function for group creation because client-only Firestore rules cannot securely validate 2–24 invitees are all Friends within rule read limits.
   - Use Firestore auto IDs for group conversations; group identity is not deterministic from member set.
   - Require creator to set a group name and select 2–24 Friends, creating a 3–25 member group including creator.
   - Group name trims whitespace, must be 1–60 characters after trim, and does not need to be unique.
   - Defer rename UI, member add/remove UI, leave UI, and admin transfer UI to slice 4b, but keep service/rules shape compatible with those lifecycle operations.
   - Friends `+` opens `/conversation/new` with group name input and Friend picker/search.
   - `Create` stays disabled until group name is valid and 2–24 Friends are selected.
   - Successful creation navigates to `/conversation/[id]`.
   - `/conversation/[id]` handles both DM and group conversations: group routes load by id and use `conversation.name`; pending DM routes still use `otherUid` before the first message creates the conversation.
   - If `/conversation/[id]` has no existing conversation and no `otherUid`, show a not-found/error state.
   - Empty groups are valid before first message; conversation empty state says `Start planning in [group name].`
   - Group chat UI shows sender display name above non-current-user message bubbles; no avatars or read receipts in 4a.
   - Conversation screen loads user profiles for group message senders as needed.
   - Inbox preview for groups with no messages says `No messages yet`.
   - Inbox sorts active conversations by `lastMessageAt`; conversations without `lastMessageAt` sort after active conversations by newest `createdAt`.
   - `conversation.memberUids` means active members only; `members/{uid}` preserves membership history with `leftAt`.
   - Any active group member can send text messages through client Firestore writes; membership requires `members/{uid}.leftAt == null`, not only presence in `conversation.memberUids`.
   - Rules allow group text sends only when `conversation.type == group`, the sender is in `conversation.memberUids`, sender member doc has `leftAt == null`, `senderUid == request.auth.uid`, and text is valid.
   - Sending a group text updates `lastMessageAt` and `lastMessage`, creates a message doc, creates `new_group_message` notifications for every other active member, and updates sender state with `lastSeenAt` plus `hiddenAt: null`.
   - Group message notification fanout remains client-written in 4a and moves to a trusted function later with broader message-send hardening.
   - Group create creates conversation state docs for all initial members; sending a message does not create recipient state docs.
   - Group conversation doc fields in 4a: `type: group`, sorted active `memberUids`, `adminUid`, `name`, `photoUrl: null`, `createdAt`, `createdByUid`, `lastMessageAt: null`, `lastMessage: null`, and `archivedAt: null`.
   - Group member docs use `{ uid, role, joinedAt, leftAt: null, invitedByUid }`; creator has `role: admin` and `invitedByUid: null`, selected friends have `role: member` and `invitedByUid: creatorUid`.
   - Group create sends `added_to_group` notifications to selected friends only, with `actorUid`, `conversationId`, and `createdAt`; creator receives no create notification.
   - First group message later uses normal `new_group_message` notifications.
   - Do not add a separate DM picker in this slice; DMs still start from Profile.
   - Add Friends only; group picker eligibility comes from canonical `friendships` docs where `memberUids array-contains viewerUid`, not mutual follow arrays.
   - Implement `createGroupConversation` as Firebase Functions v2 JavaScript/CommonJS callable in a minimal `functions/` package.
   - `createGroupConversation` Cloud Function validates auth, normalized group name, 2–24 selected friend UIDs, 3–25 total active members including creator, and Friendships for every selected member before writing group docs.
   - `createGroupConversation` returns `{ conversationId }`; client loads/subscribes to the conversation after navigation rather than receiving full conversation data.
   - Direct client group conversation creation is denied by rules; the Cloud Function owns group membership grants.
   - Creator is exactly one admin.
   - 25 member cap.
   - Tests: pure group name/payload validation, group inbox preview/sort, group text write builder; callable function tests for unauthenticated, invalid name, invalid member count, non-friend selected, and successful doc/state/notification writes; rules tests for denied direct client group create, active member read/send, non-member read/send denial, and left-member read/send denial; UI/view-model tests for create disabled state, group title, and group sender labels.
5. Group lifecycle/admin slice 4b
   - Group membership lifecycle mutations use trusted callable Functions, following ADR 004.
   - All lifecycle Functions require an existing non-archived `group` conversation and caller active membership; admin-only Functions additionally require caller is current `adminUid`.
   - Add user-visible minimal lifecycle UI: group header opens `/conversation/[id]/info` for group conversations.
   - DM header stays unchanged; no DM info route in 4b.
   - Group info screen is accessible only to active members; former/non-members get normal no-access/not-found behavior from conversation reads.
   - Group info screen lists active members only and owns lifecycle actions; former members stay in `members/{uid}.leftAt` for audit/function logic but are not shown in 4b UI.
   - Group info active member list uses `conversation.memberUids` as the active source, fetches `users/{uid}` for display, and may fetch `members/{uid}` for role/joinedAt metadata; it does not query all member docs.
   - Only admin sees Add members and Remove buttons; non-admins see member list plus Leave group only.
   - `inviteToGroup({ conversationId, selectedMemberUids })` lets admin add Friends to existing groups.
   - Add-member UI uses a multi-select Friend picker like group creation, excluding current active members, current user, and non-Friends.
   - Add-member selection allows 1 through remaining group slots up to the 25-member cap.
   - `inviteToGroup` rejects the whole request if any selected uid is already an active member, is not a Friend of the admin, or if `activeCount + selectedUniqueCount > 25`; no partial add.
   - Former members can be re-added; re-add restores them to `conversation.memberUids`, sets/merges `members/{uid}` to `role: member`, new `joinedAt`, `leftAt: null`, and `invitedByUid: adminUid`, creates/restores their conversation state with `hiddenAt: null`, and sends `added_to_group` notification.
   - Added members receive `added_to_group` notifications; existing members and admin receive no lifecycle notifications in 4b.
   - `removeGroupMember` lets admin remove non-admin members.
   - Admin cannot remove themselves through `removeGroupMember`; admin self-exit must use `leaveGroup` with next-admin rules.
   - Member removal is silent in 4b: no system message and no notification to the removed member; they disappear from active member list/inbox through membership loss.
   - `leaveGroup` lets any non-admin member leave self.
   - `leaveGroup` lets admin leave only if they select another active member as next admin.
   - Admin leave requires explicit `nextAdminUid` whenever any member remains, even if only one member remains; UI may preselect the sole remaining member but the Function still requires the value.
   - Admin leave uses one Leave group flow: if remaining members exist, show next-admin picker and confirm `Leave and make [user] admin`; do not add standalone transfer-admin in 4b.
   - Remove member requires a destructive confirmation prompt.
   - Leave group requires a destructive confirmation prompt; admin next-admin picker confirmation counts as the leave confirmation.
   - Add members does not require an extra confirmation after picker submission.
   - Leaving is silent in 4b: no system message and no notifications.
   - After successful leave, client navigates back to Friends; the group disappears from that user's inbox because their uid is removed from `memberUids`.
   - If the last member leaves, the group is archived and client navigates back to Friends.
   - Leaving/removing a member removes their uid from `conversation.memberUids` and sets `members/{uid}.leftAt`.
   - Leave/remove does not update `lastMessageAt` or `lastMessage`; silent lifecycle changes do not bump inbox order for remaining members.
   - Former members lose normal inbox and message read access after leaving/removal; beta rules read access is active-member only.
   - After self-leave succeeds, client navigates to Friends immediately.
   - If a user is removed while viewing chat/info, later read/listener failure shows the existing no-access/not-found fallback with Go back; no special real-time redirect in 4b.
   - Archived empty groups have `memberUids: []`, `archivedAt: now`, and `adminUid: null`.
   - Last leaver's member doc gets `leftAt`.
   - Keep exactly one active admin for non-archived groups with active members.
   - Tests: pure/service tests for invite payload validation, remaining slot limits, admin leave outcome, and group info action visibility for admin vs non-admin; callable Function tests for invite rejects non-admin/non-friend/active member/cap and succeeds add/re-add docs/state/notifications, remove rejects non-admin/self/admin target/non-member and succeeds `memberUids` removal plus `leftAt`, leave rejects non-member/admin missing next admin/invalid next admin and succeeds non-admin leave, admin leave transfer, and last-member archive; UI/view-model tests for group header opening info, active-member-only list, member list/add picker loading and empty states, name fallback to `displayName || username || uid`, admin badge, admin-only Add/Remove controls, non-admin Leave-only controls, Remove hidden for self/admin target, mutation disabled states, add picker excluding active members/current user through search filtering, add button disabled for no selection/cap overflow, remove confirmation copy, leave confirmation copy, admin next-admin picker with sole remaining member preselected, admin next-admin confirmation copy, function error alerts, post-leave navigation to Friends, and removed/no-access fallback; rules tests keep/regress former member cannot read/send.
6. Rating canonicalization and public projection cleanup
   - Make `ratings/{ratingId}` the only canonical opinion document written by review creation.
   - Add `visibility: public|unlisted|private` to Rating contract; do not add visibility UI in this slice; new Ratings default to `public`.
   - Stop all new writes to `reviews`; `reviews` becomes legacy read/migration concern only.
   - Preserve legacy `reviews` Firestore reads; revoke `reviews` create/update/delete in slice 6 so stale code cannot fork the canonical opinion object.
   - Do not migrate existing `reviews`, random-ID `ratings`, or random-ID `posts` in this slice; support legacy reads only where cheap and keep data migration/backend cleanup as a later task.
   - Add a Rating service seam before rewiring UI: pure `lib/ratings/*` helpers build canonical Rating payloads, decide whether a public projection is warranted, and map denormalized Post projection fields with no Firebase imports.
   - Add a thin Firebase adapter for Rating creation that owns Firestore `ratingId` minting, but makes ID/doc-ref creation injectable for tests; pure helpers receive `ratingId` as input and `app/venue/[id]/rate.js` never mints IDs directly.
   - Rewrite `lib/media-upload.js` review helpers for Rating media: the adapter mints `ratingId` with `doc(collection(db, 'ratings'))`, uploads photos under `ratings/{ratingId}/...`, and writes no `reviews` doc.
   - Upload photos before the Firestore batch because Rating/Post docs denormalize media references; if any upload fails, abort before writing Rating/Post docs.
   - Store Rating media Storage paths as the canonical persisted representation; do not persist Firebase download URLs in new Rating/Post docs because tokenized URLs can bypass later visibility changes.
   - If uploads succeed but the Firestore batch fails, best-effort delete uploaded files and tolerate orphaned Storage objects if cleanup fails; orphaned media is preferable to visible docs with broken media references.
   - Update `storage.rules` in this slice to allow the new `ratings/{ratingId}/photo_[timestamp]_[index].jpg` path; do not leave media uploads broken behind legacy `reviews/{reviewId}/...` rules.
   - Rating media Storage writes happen before the Rating doc exists, so Storage write rules authorize by signed-in user, path shape, image content type, and size cap only; do not add Firestore ownership lookup to this upload write rule in slice 6.
   - Rating media Storage reads must be rule-gated against the Rating doc in slice 6: allow if `ratings/{ratingId}.visibility == 'public'` or `ratings/{ratingId}.userId == request.auth.uid`; defer active-share read access until the unlisted share slice.
   - Factor the Storage rule Rating lookup into a helper to avoid duplicate structural reads, and allow transient in-memory URL caching in UI adapters; do not persist resolved download URLs.
   - Preserve the legacy `reviews/{reviewId}/...` Storage path for existing media until a later migration/cleanup slice; slice 6 only adds the canonical Rating media path.
   - Demote `posts` to the interim public projection keyed by Rating ID: write public projections to `posts/{ratingId}` with `setDoc(doc(db, 'posts', ratingId), ...)`, not random `postId` documents.
   - Create `posts/{ratingId}` only when `ratings/{ratingId}.visibility == 'public'`; private/unlisted Ratings have no public Post projection and are reached through owner/share-gated Rating reads.
   - For public Ratings, write `ratings/{ratingId}` and `posts/{ratingId}` in one `writeBatch` so a public review cannot half-commit with Rating present and Post missing.
   - Firestore rules must allow `posts/{ratingId}` create only when matching `ratings/{ratingId}` exists after the request using `existsAfter/getAfter`, belongs to `request.auth.uid`, has `visibility == 'public'`, and the Post projection has `ratingId == ratingId` plus `userId == request.auth.uid`; orphan public projections are denied.
   - Do not replace the `existsAfter/getAfter` projection gate with `exists/get`; `get()` cannot see same-batch pending Rating creates, while `getAfter()` validates the post-batch state.
   - Use `userId` as the owner field on both `ratings/{ratingId}` and `posts/{ratingId}`; do not introduce `authorUid` in slice 6.
   - Do not implement Post re-projection/update behavior in slice 6; `posts/{ratingId}` create-only is enough for the current Rating creation flow.
   - Firestore update rules for `posts/{ratingId}` should default-deny in slice 6; owner display re-projection and non-owner engagement writes belong to later edit/feed-action slices.
   - Defer non-owner Post engagement write rules for likes/bookmarks to the Feed/List/Profile polish slice; venue want-to-try bookmarks are user-owned and belong to the venue enrichment slice; slice 6 only establishes projection create shape and keeps future engagement fields off Rating.
   - Keep engagement state (`likes`, `likedBy`, comments, bookmarks) and the existing comments subcollection on `posts/{ratingId}`, not on the private Rating.
   - Initialize public projection engagement fields for compatibility: `likes: 0`, `likedBy: []`, `bookmarks: 0`, and `bookmarkedBy: []`.
   - Use `notes` as the canonical Rating text field; do not write new `description` fields. Legacy reads may fall back from `notes` to `description`.
   - Use `mediaPaths` as the canonical Rating photo field; do not write new `mediaUrls` or `photoURLs` fields. Legacy reads may fall back from `mediaPaths` to `mediaUrls` to `photoURLs`.
   - UI/display adapters may resolve authorized `mediaPaths` to temporary image URLs at render time, but those URLs are transient view data and must not be written back to Firestore.
   - Denormalize feed display fields (`venue`, `sentiment`, `notes`, `mediaPaths`, author display) into `posts/{ratingId}` for current Feed/Post screens, while `ratings/{ratingId}` remains source of truth.
   - Treat the `ratings/{ratingId}` document ID as the canonical Rating identity; new Rating payloads do not write a self-`ratingId` field, and read adapters should derive Rating identity from the snapshot/document ID.
   - Include `ratingId` in `posts/{ratingId}` even though it duplicates the document ID, and require `posts/{ratingId}.ratingId == ratingId` in rules so feed rows, review links, debug, and future projection migration have an explicit canonical pointer.
   - New Rating/Post payloads must not write `reviewId`; tolerate legacy `reviewId` only as a read-time fallback where needed.
   - Defer `feedItems` until a backend projection worker exists; current rules make `feedItems` backend-only, so client review creation must not target it.
   - Keep Pairwise Comparisons and Personal Ranking driven by Ratings.
   - Harden Rating reads before unlisted sharing: owner can read own Ratings; anyone can read `visibility == 'public'`; `unlisted`/`private` are not public-readable yet; share-gated reads wait until the unlisted share slice.
   - Rating create rules must require `userId == request.auth.uid`, valid `visibility: public|unlisted|private`, required canonical fields, no self-`ratingId` field, and no public engagement fields (`likes`, `likedBy`, `comments`, `bookmarks`, `bookmarkedBy`, `commentsCount`) on the Rating.
   - Do not implement Rating edit or visibility-transition behavior in slice 6; current PRD has no edit-my-Rating user story, and visibility changes require projection create/delete cascades that belong with a later privacy/share slice.
   - Visibility transitions are deferred to the later privacy/share slice; public→private/unlisted must delete or disable `posts/{ratingId}`, and private/unlisted→public must create `posts/{ratingId}` because Firestore rules cannot cascade projection changes.
   - Rating update rules should default-deny in slice 6. If a defensive update scaffold is kept, it must keep `userId`, `createdAt`, and `visibility` immutable, deny engagement fields on Rating, and must not open updates for `notes`, `mediaPaths`, or `sentiment`.
   - Add pure Jest tests for canonical Rating payloads, no Firebase import in builder helpers, public-only projection decisions, canonical `mediaPaths` with no new persisted download URLs, and projection pointer/display shape.
   - Add adapter/emulator tests for no new `reviews` writes, no new `reviewId` alias fields, Rating media paths/storage write/read rules, deterministic `posts/{ratingId}` public projection creates with no random Post fork, `existsAfter/getAfter` public projection gating, public Rating batch atomicity, legacy `reviewId`/`postId` avoidance in new link contracts, Rating/Post update denial, and Rating/Post visibility/read/write rules.
7. Venue enrichment slice
   - Goal: make venue pages credible enough for social sharing without broad redesign drift. Build a blueprint component for future full venue page redesign.
   - Venue detail adds: hero photo fallback (deterministic color/pattern per venue), Website and Directions action buttons, open/closed status from seed `hours.openNow`, average public Rating sentiment score, and recent public Ratings as "popular posts".
   - Venue detail wires bookmark/want-to-try as user-owned Firestore write: `users/{uid}/venueBookmarks/{venueId}` with `venueId`, `venueName`, `city`, `cohort`, `createdAt`.
   - Firestore rules: owner-only read/write/delete for venue bookmarks.
   - List row: thumbnail/fallback, wired bookmark icon, fix hardcoded light-mode colors to use `COLORS` tokens. Add/Dismiss icons removed or made non-tappable.
   - Rate screen: venue thumbnail/fallback, minimal review preview before submit.
   - Blueprint component `components/VenueDetailBlueprint.js`: commented placeholder sections for future map hero, swipeable photo gallery, friend score, deep link sharing, drink pricing. Compiles but does not render in production routes.
   - Defer to post-messaging slices: interactive map, Places Photo API, deep links to external apps, friend rank aggregation.
   - Tests: pure helpers for visual fallback, open status, bookmark payload; service/rules tests for bookmark owner access; UI assertions for detail hero/bookmark/popular posts, list row thumbnail/colors, rate preview.
   - Run `npm test -- --runInBand`, `npm run test:rules`, `npx expo export --platform web` before handoff.
8. Venue link messages in Friends chat
   - Goal: let users share a venue into an existing DM or group chat now that venue detail pages have credible context.
   - Add `venue_link` message support behind a pure/service seam before UI wiring. Do not add review links, polls, generic attachments, reactions, replies, or unlisted Rating shares in this slice.
   - Canonical message payload fields: `senderUid`, `type: venue_link`, `venueId`, `venueName`, `venueCohort`, `venueCity`, `venueAddress`, `createdAt`, and `deletedForEveryoneAt: null`.
   - Conversation `lastMessage` for venue links includes `id`, `senderUid`, `type: venue_link`, the venue fields above, and `createdAt`.
   - A venue link references the static venue catalog by `venueId`; it does not copy venue ratings, bookmarks, photos, map links, or mutable venue stats into the message.
   - Venue link sends use the same client-owned batch pattern as text messages for this beta slice: update `conversations/{conversationId}.lastMessage*`, create `messages/{messageId}`, update sender conversation state, and create normal direct/group message notifications.
   - Direct venue links may create the canonical DM on first send if the sender and recipient are Friends, using the same `dm_{minUid}_{maxUid}` identity as text DMs.
   - Group venue links can be sent only by active group members; direct client group creation remains denied.
   - Firestore rules must validate `venue_link` shape for both message docs and `lastMessage`, while preserving existing text-message rules.
   - Inbox preview uses existing copy: `Venue: [venueName]`, with group sender prefix unchanged.
   - Conversation UI renders venue links as tappable cards showing venue name, cohort, address/area, and deterministic thumbnail/fallback; tapping opens `/venue/[venueId]`.
   - Venue detail adds a Share action that opens a conversation picker for existing DMs/groups and sends the venue link into the selected conversation.
   - The conversation picker reads current user's inbox conversations only; if none exist, show an empty state that points users back to Friends to create a chat.
   - Do not add a global venue picker or start-new-DM friend picker in this slice; sharing starts from venue detail into existing conversations.
   - Add pure Jest tests for venue link payload normalization, direct/group write builders, and inbox preview labels.
   - Add rules tests for DM first-send venue links, group venue links, invalid venue-link shapes, and non-member/non-friend denial.
   - Add UI/source assertions for venue detail Share, conversation picker send paths, and conversation venue-link cards.
   - Run `npm test -- --runInBand`, `npm run test:rules`, and `npx expo export --platform web` before handoff.
8b. Review/social planning follow-up slices, split before implementation
   - Review link messages by `ratingId`.
   - Review companion tagging.
   - Unlisted private Rating shares.
9. Feed/List/Profile polish slice
   - Real Feed actions.
   - Feed Post like/comment/share/bookmark engagement, excluding venue want-to-try bookmarks already handled in slice 7.
   - Confirm Profile personal list excludes discovery rows.
   - Cohort isolation regression tests.
10. Safety slice
   - Block.
   - Report.
   - Delete/hide messages.
   - Notification privacy basics.
11. Rich attachment slices
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
