# Friends Tab PRD

## Status
Current product source of truth for Friends behavior. Use `docs/prd/current-to-desired-state.md` for slice order and implementation tracker.

## Product vision
Friends is the hero tab for coordinating nights out with people the user actually plans with. It replaces the current Feed tab position. Feed moves to the current List tab position. List moves to the current Leaderboard/Rank position. Leaderboard/Rank is removed.

Friends uses chat, polls, links, and location pins as the planning tools. Calendar features, event scheduling, reminders, and standalone planning dashboards are out of scope for MVP.

## MVP success criteria
- Users can create Friendship and start a direct message.
- Users can create group chats with Friends.
- Users can plan where/when through text, polls, venue links, and location pins.
- Users can connect night-out history through companion tags and review links.
- Safety basics work: block, report, delete, and hide.
- Leaderboard/Rank tab is absent from primary navigation.

## Navigation
Planned tab order:
1. Friends
2. Feed
3. Add
4. List
5. Profile

## Social model

### Follow
Public social subscription used for profile/feed visibility. Follower/following counts remain visible on profiles.

### Friendship
Private accepted relationship used for logistics and conversation. Friend count is not public.

Friend request entry points:
- Profile screen button: Add Friend / Requested / Respond / Friends.
- Search results quick action.
- Friends tab pending requests.
- Phone contact sync is out of scope for MVP.
- QR/link invites are out of scope for MVP.

Friendship visibility:
- Profile actions keep Follow/Following separate from Add Friend/Friends.
- Friend count is not public.
- Friend list is not public.
- User can see their own Friends list in the Friends tab and create-chat flow.
- Mutual Friends indicators are out of scope for MVP.

Friendship rules:
- Friendship is separate from following.
- Mutual follows do not automatically create Friendship.
- Friendship starts only after a Friend Request is accepted.
- Accepting a Friend Request creates Friendship and automatically creates follow/follow-back.
- Friendship is a stronger relationship than following; accepting a Friend Request intentionally opts into mutual feed visibility.
- User can later remove Friend and then unfollow if they no longer want feed visibility.
- Accepting a Friend Request does not auto-create a direct message thread.
- After acceptance, the UI offers a `Message` CTA.
- First message creates the canonical direct-message thread.
- Removing Friendship leaves follows intact.
- DM and group chat invite eligibility are based on Friendship, not following.

## Friends tab landing screen
Hero section is an inbox. Being inside Rounds already supplies the planning-night-out context, so there is no separate planning dashboard.

Landing screen requirements:
- Top-right `+` icon creates a chat.
- Primary content is conversation inbox sorted by latest non-hidden message.
- Pending friend requests must be accessible from this surface.
- Friend/followed activity belongs on Feed, not Friends.

Offline behavior:
- App may show cached inbox/messages when Firestore cache has them.
- Sending messages requires network in MVP.
- Failed sends show retry affordance.
- Attachment uploads show progress.
- Offline send queue is out of scope for MVP.

Search behavior:
- Users can search conversations by participant name or group name.
- Message text search is out of scope for MVP.
- Users can search Friends when creating a chat.
- Users can search venues/reviews through attachment pickers, not global chat search.

Inbox preview rules:
- Hidden/deleted-for-self conversations stay hidden until a new message arrives.
- Preview shows sender plus message summary.
- Text preview shows message snippet.
- Voice note preview: `Voice note`.
- Poll preview: `Poll: [question]`.
- Photo preview: `Photo`.
- Location preview: `Location`.
- Review link preview: `Review: [venue]`.
- Venue link preview: `Venue: [name]`.

## Conversation permissions
- Direct messages require Friendship between both participants.
- There is one canonical direct-message thread per user pair.
- Reopening a hidden direct message restores the same thread.
- Group chat creator can add only Friends.
- Group chats support up to 25 members in MVP.
- Group members can invite only their Friends unless later restricted by group settings.
- Friendship is required to invite someone to a group, not to remain in an existing group.
- Removing Friendship does not auto-remove users from shared groups.
- Follower-only DMs are not allowed.

## Conversation membership lifecycle
- Any group member can leave a group chat.
- Group creator/admin can remove members.
- Each group chat has exactly one admin.
- If admin leaves while other members remain, they must choose the next admin before leaving.
- There is no hard delete for users; deleting a chat removes/hides it from that user's inbox only.
- Group chat is archived only when the last member leaves.

## Conversation identity
- Direct message display name/photo comes from the other participant.
- Group chat creator must set a group name.
- Group chat photo is optional.
- If no group photo exists, the app generates an avatar from the group name.
- Only the group admin can edit group name/photo.

## Message types and attachment scope
MVP / early build:
- Text messages.
- Message reactions.
- Reply-to-message quotes.
- Photo attachments.
- Voice notes.
- One-time location pins.
- In-app review links.
- Venue links.
- Polls.

Production plan, not prototype default:
- Video attachments.

Never supported:
- Payments.
- Generic file attachments.

Location behavior:
- Shared location means one-time location pin only.
- User can share current location or a searched place.
- Continuous live location is out of scope for MVP.

Photo behavior:
- Photo attachments are persistent by default.
- Sender can delete photos for everyone.
- Members can hide photos for themselves.
- Auto-expiring photo mode is out of scope.

Voice note behavior:
- Maximum voice note length is 60 seconds.
- Audio files are stored in Firebase Storage.
- Message metadata stores duration, storage URL, sender, and createdAt.
- Voice notes are temporary by default unless at least one conversation member saves them.
- Unsaved voice notes expire no later than 24 hours after being sent.
- Unsaved voice notes disappear for each listener 3 minutes after that listener plays them.
- No transcription in MVP.
- Sender can delete a voice note for self or everyone; other members can only hide it for themselves.

## Replies
- Reply-to-message quotes are in scope for MVP.
- Replies appear inline in the same chat with a quote preview.
- Threaded conversations are out of scope for MVP.
- If the original message is deleted, the quote shows `Original message deleted.`

## Message reactions
- Emoji reactions are in scope for MVP.
- MVP reaction set is limited to: 👍 ❤️ 😂 😮 😢 🔥.
- Users can add/remove their own reaction to a message.
- Multiple users can react with the same emoji.
- Reaction counts and reacting users are visible to conversation members.
- Custom emoji/sticker packs are out of scope for MVP.

## Poll model and voting rules
- Poll creator writes a question and plain-text options.
- Poll can be single-choice or multi-choice.
- Votes are visible to group members by default.
- Poll creator can allow members to add options.
- Poll creator can close poll manually.
- Poll creator can set an optional close time.
- Voters can change their vote until the poll closes.
- Closed poll results are immutable.
- Creator/admin cannot edit other users' votes.
- Ranked-choice polls are out of scope for MVP.

## Review link behavior
- Any public Post/Review can be shared into chat.
- A Private Rating can be shared only by the user who created it.
- Shared Private Ratings are shown with an `Unlisted` tag.
- Review link preview shows venue, author, sentiment, notes snippet, and first photo when available.
- Tapping a public review link opens existing post detail.
- Tapping an unlisted private rating opens a private-rating detail view available only through that shared link.
- Unlisted private rating access is limited to members of the conversation where it was shared.
- Forwarded unlisted links do not grant access unless the author explicitly shares the rating into the new conversation.
- If a member leaves a group, they lose access to unlisted private ratings shared in that group.
- Author can revoke unlisted access.

## Review companion selection behavior
- Review form lets author select individual users as companions.
- Author can tag any searchable user, not only Friends.
- Review form quick-picks Friends and recent group chats.
- Review form lets author select a group chat as a shortcut.
- Selecting a group chat adds the current group members as individual companion tags.
- Review does not store or display the group chat name.
- On public posts, companion tags are visible to everyone who can see the post.
- On private/unlisted ratings, companion tags are visible only to users with access.
- Tagged users receive a notification.
- Tagged users can remove themselves from the review.
- Once a tagged user removes themselves, the tag disappears everywhere and the same author cannot re-tag that user on the same review.
- Tagged users can block all future tags from that author.
- Tagged users can block or report the tag/review.
- Author does not need prior permission to tag a user, matching Instagram-style tagging.
- Tagging a user does not create a Follow, Friendship, DM, or any other social relationship.

## Notifications
MVP notification events:
- Friend request received.
- Friend request accepted.
- New direct message.
- New group message.
- Added to group chat.
- Tagged in review.
- Poll created in conversation.

Push notification privacy:
- Push notifications show sender/chat name plus `New message`.
- Message body is hidden by default.
- User setting for message previews can come later.

Out of scope for MVP notifications:
- Poll closing soon.
- Voice note expiry.

## Privacy, blocking, reporting, deletion
Blocking behavior:
- Blocking removes Friendship both ways.
- Blocking removes follower/following relationships both ways.
- Blocked users cannot send friend requests, DMs, group invites, review tags, or comments.
- Existing DMs are hidden/frozen for the blocker.
- Blocked user may see old chat history but cannot send new messages.
- In shared group chats, messages from blocked users are collapsed for the blocker.
- Existing review tags created by the blocked user are removed from the blocker.

Read receipts and typing:
- Direct messages show `Seen` for the sender's latest sent message.
- Group chats do not show per-message read lists in MVP.
- Typing indicators are out of scope for MVP.

Message deletion/editing:
- Message editing is out of scope for MVP.
- Sender can delete text, photo, voice note, location pin, poll, venue link, or review link messages for everyone.
- Any user can hide any message for themselves.
- Deleting a message for everyone leaves a tombstone: `Message deleted.`
- Deleting a poll message closes/removes the poll from chat.

Age policy:
- Rounds account policy is 18+.
- Production onboarding should enforce or attest to 18+ before broad launch.

Reporting behavior:
- Users can report another user.
- Users can report a message.
- Users can report a group chat.
- Users can report a review tag.
- Reported target is hidden for the reporter immediately.
- Reported message content is preserved for moderation.
- No auto-ban in MVP.
- Formal moderation queue can come after early beta, but before broad production launch.
- Chat development should not be suspended while reporting operations are still maturing because beta will be limited to known testers.

## Data model and rollout plan
Architecture direction:
- MVP beta can use Firestore client writes with strict security rules.
- Do not build Friends or ranking work against deprecated `leaderboardEntries`.
- Existing `leaderboardEntries` rules can be cleaned up later in a separate tech-debt pass; avoid rules churn during Friends build.
- Cloud Functions should handle denormalized inbox updates and notifications.
- Chat and Friends logic must live behind service seams such as `lib/friends/*`, not inside route screens.
- Production should move sensitive mutations behind Cloud Functions, including friend accept, group invite/remove, unlisted access grants/revokes, and delete-for-everyone.

Canonical Firestore shape:
- `friendRequests/{fromUid}_${toUid}` for active requests.
- `friendships/{minUid}_${maxUid}` with sorted pair key.
- `blocks/{blockId}` with blocker/blocked fields.
- `conversations/{conversationId}`
- `conversations/{conversationId}/messages/{messageId}`
- `conversations/{conversationId}/members/{uid}`
- `users/{uid}/conversationStates/{conversationId}` for hidden/read/lastSeen state.
- `users/{uid}/notifications/{notificationId}`
- `ratings/{ratingId}/shares/{conversationId}` for unlisted access.

Identity constraints:
- Duplicate/inverse friend requests must be prevented by rules or Cloud Functions.
- If inverse friend request already exists, accepting should create Friendship instead of creating a second pending request.

Production Cloud Function boundaries:
- `sendFriendRequest(toUid)`
- `respondFriendRequest(requestId, accept|decline)`
- `removeFriend(uid)`
- `createConversation({ type, memberUids, name, photo })`
- `sendMessage(conversationId, payload)`
- `inviteToGroup(conversationId, uid)`
- `removeGroupMember(conversationId, uid)`
- `leaveGroup(conversationId, nextAdminUid?)`
- `deleteMessageForEveryone(conversationId, messageId)`
- `sharePrivateRating(ratingId, conversationId)`
- `revokePrivateRatingShare(ratingId, conversationId)`
- `blockUser(uid)`
- `reportTarget(target)`

Beta implementation order:
1. Tab rename/reorder and Friends empty inbox.
2. Friend requests, Friendship, and auto mutual follow.
3. Direct-message text only and inbox.
4. Group-chat text only.
5. Review companion tagging.
6. Review links and venue links.
7. Polls.
8. Photos.
9. Voice notes.
10. Location pins.
11. Reporting/blocking hardening and notifications.

Security rule/function test plan:
- Non-member cannot read conversation metadata or messages.
- Non-friend cannot create direct message.
- Non-friend cannot invite a user to a group chat.
- Member cannot exceed group cap.
- Non-admin cannot remove a member.
- Non-admin cannot edit group metadata.
- Leaving admin must provide a valid next admin.
- User cannot forge `senderUid`.
- User cannot access unlisted rating unless it was shared into a conversation where they are an active member.
- Block prevents friend request, message, invite, review tag, and comment.
- Delete-for-self only affects the deleting user's state.
- Delete-for-everyone is limited to sender or trusted function.
