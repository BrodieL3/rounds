# Rounds Context

## Domain vocabulary

### Venue

A nightlife place users discover, rate, post about, and compare. Current venue metadata comes from `assets/venues.json`, seeded from Google Places-like data.

### City

A market-scoped venue pool. Current city keys (beta catalog, ADR 007): `boston`, `cambridge`. `nyc`/`chicago`/`sf` are not yet seeded.

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

User-specific ordered list produced from Comparisons within a Cohort. Current implementation is a per-user Bayesian Bradley-Terry posterior (`lib/ranking-bt.js` + `lib/personal-rankings.js`, ADR 010), ranked by posterior lower bound; the earlier Elo calculation (`lib/ranking.js` + `lib/compare-select.js`) was deleted after confirming zero live consumers. No canonical server-side ranking exists yet (see ADR 009, designed-not-built).

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

### Discover

User-facing replacement for the prior Feed tab. Discover is the public/city discovery surface in the Figma UI. During the UI overhaul it can reuse current Feed/Post projection data as placeholder backing data until deeper Discover behavior is specified.

### Feed

Legacy implementation word for the city-scoped public activity stream backed by `posts`. New user-facing UI should say Discover unless referring to existing code modules or Firestore projection behavior.

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
