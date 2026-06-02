# Rounds Context

## Status
Current source of truth for Rounds domain vocabulary and product priorities. This file is a glossary/context guide, not an implementation spec. See `CONTEXT-MAP.md` for doc loading order and `docs/prd/current-to-desired-state.md` for implementation roadmap.

## Current goal

Rounds is now a working Expo/Firebase mobile prototype shifting from nightlife discovery/ranking toward friend-coordinated nightlife planning. Near-term work should deepen the MVP already in code while making Friends the hero surface: onboarding, city venue lists, venue rating, social feed, profiles, cohort-scoped pairwise comparison, and friend planning.

Do not treat this repo as a fresh Expo exercise. Treat it as a product prototype whose next goal is to make the current client/Firebase slice coherent, testable, and ready for a backend seam where chat, feed, ranking, and social planning state stops belonging in client screens.

## Current product slice

- User can sign up or log in with Firebase Auth.
- Onboarding collects phone, email/password, display name, username, photo URL, city, cohort preferences, and optional Spotify genre data.
- Venue discovery uses static seeded venue data from `assets/venues.json` for NYC, Boston, Chicago, and San Francisco.
- Venue detail shows Google Places-derived metadata: address, price, rating, review count, tags, hours, and map link.
- Rating a venue creates both a private `ratings` record and a public `posts` record.
- Feed reads city posts from Firestore, promotes followed users above city activity, and supports post detail likes/comments.
- Profile shows user stats, recent reviews, followers/following counts, and a people search path.
- Pairwise comparison lives in `/compare`; it chooses venues from one cohort where the user has at least two ratings.
- Friends is the planned hero surface for coordinating nights out with direct messages, group chats, chat attachments, polls, review links, and review companion selection.
- Leaderboard/rank screen is deprecated before implementation; ranking exists only as local Elo-like computation over comparisons.

## Architecture facts from code

- Mobile app: Expo SDK 54, Expo Router, React Native.
- Data store: Firebase Auth, Firestore, Firebase Storage.
- Route ownership: Expo Router files own navigation; `/compare` owns primary pairwise ranking action.
- Current venue seed is static JSON, not a Firestore collection.
- Current screens call Firestore directly. There is no backend worker/module yet for canonical chat, feed, or personal-ranking state.
- Firestore rules already anticipate backend-owned `feedItems` and deprecated `leaderboardEntries`, but the current app reads/writes `posts`, `ratings`, `comparisons`, `users`, and `reports` directly.
- Current tab order is Feed, List, Add, Rank, Profile. Planned tab order is Friends, Feed, Add, List, Profile; Leaderboard/Rank is removed.
- Tests currently cover pure modules: auth routing, auth cache, ranking, and TicketsData client.

## Domain vocabulary

### Venue

A nightlife place users discover, rate, post about, and compare. Current venue metadata comes from `assets/venues.json`, seeded from Google Places-like data.

### City

A market-scoped venue pool. Current city keys: `nyc`, `boston`, `chicago`, `sf`.

### Cohort

The venue comparison category. Cohort is the peer-cohort isolation key and must stay consistent across venue list filtering, ratings, comparisons, and ranking. Current cohorts: `cocktail_bar`, `wine_bar`, `sports_bar`, `pub`, `night_club`, `dive_bar`.

### Rating

A user's canonical visit-level opinion about a Venue. Current sentiment values: `loved`, `fine`, `disliked`. Rating can include notes, uploaded photos, companion tags, and visibility.

### Review

User-facing word for a Rating. Review is not a separate canonical domain object from Rating.

### Post

Derived public feed projection of a public Rating. Post is not the canonical shareable opinion identity. Public engagement such as likes, comments, and bookmarks belongs to the public projection.

### Comparison

A pairwise decision between two venues in the same Cohort. Current result is either the winning venue id or `too-tough`.

### Too Tough

Escape hatch for a Comparison when the user cannot choose. Current ranking computation ignores `too-tough` results.

### Personal Ranking

User-specific ordered list produced from Comparisons within a Cohort. Current implementation is local Elo-like calculation in `lib/ranking.js`; no canonical server-side ranking exists yet.

### Friends

Hero social planning surface where users coordinate nights out with friends. Friends contains conversations and planning tools, not global city activity.

### Friendship

A private accepted relationship between two users for planning nights out. Friendship is separate from following, is not exposed as a public count, and implies mutual following so friends also appear in normal social/feed contexts. Friendship is created only when a Friend Request is accepted. Removing a Friendship does not remove either user's follows.

### Friend Request

A request from one user to another to create a Friendship. Accepting a Friend Request creates the Friendship and automatically creates follow/follow-back. Mutual following alone does not create Friendship.

### Conversation

A message thread between Friends. Conversations can be direct messages or group chats.

### Direct Message

A Conversation with exactly two participants. Direct messages require Friendship between both participants.

### Group Chat

A Conversation with three or more participants. Group chats can be selected as review companions when a user records who they went out with. Group chat members invite Friends, not arbitrary followers.

### Chat Attachment

Content sent inside a Conversation beyond plain text, such as photos, voice notes, one-time location pins, polls, venue links, and links to in-app reviews.

### Chat Poll

A user-authored poll inside a Conversation. Polls are general-purpose decision tools for planning a night out and are not limited to venue data. Polls can be single-choice or multi-choice.

### Review Link

A Chat Attachment that points to a Rating by `ratingId`. Review links can resolve to public Ratings or to unlisted private Ratings shared by their author.

### Review Companion

A user tagged on a review as someone the author went out with. The review form can use a Group Chat as a shortcut to add the group's current members, but the review stores user tags rather than the group chat identity.

### Feed

City-scoped activity stream with followed users promoted above other city posts. Current implementation queries `posts` directly and sorts client-side. Feed remains a product surface but is no longer the hero tab.

### Follow Graph

Public social subscription graph for profile and feed visibility. Following someone is weaker than Friendship; mutual follows do not automatically create a Friendship.

### Block

A safety relationship that prevents social interaction between two users. Blocking removes Friendship and follows, prevents future requests/messages/invites/tags/comments, and limits visibility of existing interactions.

### Age Policy

Rounds is for users age 18 and older.

### Spotify Genre Vector

Normalized genre-frequency vector from Spotify top artists. Used for cold-start taste signals. Current onboarding stores it on the user profile; event recommendation is not wired into the UI yet.

### Event Recommendation

Future discovery result from matching Spotify Genre Vector against event/lineup genre data. ADRs show the free-data path is constrained; Apify/self-hosted scraping remains the viable route for RA/Posh-quality event data.

### Crowd Report

Future live utility signal for queue/crowd/cover data. Firestore has `reports`, but current UI only submits venue miscategorization reports, not geofenced crowd reports.

## Present product priorities

1. Make Friends the hero product surface for planning nights out with direct messages, group chats, attachments, polls, review links, and review companion selection.
2. Stabilize current MVP flows: onboarding, auth routing, venue list/detail, rating/posting, feed, profile, and comparison.
3. Make cohort isolation reliable everywhere ratings and comparisons interact.
4. Move chat/feed/personal-ranking logic toward deeper modules with small interfaces before adding new surface area.
5. Decide which product state is canonical client state versus backend-owned projection.
6. Keep Spotify genre onboarding, BestTime, TicketsData, and event scraping as validated capability modules until core MVP flows are solid.

## Out of scope for near-term code unless explicitly selected

- Production-grade booking flow.
- Geofenced live crowd reporting.
- Server-side recommendation engine.
- Native module authoring.
- Rebuilding the deprecated leaderboard/rank tab before Friends exists.
- Reworking ADR conclusions about Eventbrite or free event APIs without new evidence.
