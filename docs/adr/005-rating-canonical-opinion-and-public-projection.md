STATUS: ACTIVE — agents must read before touching Ratings, Posts, review links, Rating media, or visibility/share rules.

# ADR 005: Rating Canonical Opinion and Public Projection

## Status
Accepted

## Context
Rounds review creation currently writes overlapping opinion data into `reviews`, `ratings`, and `posts`, with random document IDs and a legacy `reviewId` field tying some records together. The Friends roadmap now requires sharing both public reviews and unlisted/private opinions into conversations. A public Post cannot be the universal share target because private and unlisted opinions may not have any public feed projection.

The app also stores review photos in Firebase Storage. Persisted download URLs would make future visibility changes harder because token-bearing URLs can outlive the Firestore access decision that should control the media.

Firestore rules add one important constraint: `get()` reads committed state and cannot validate a Rating being created in the same client batch as its Post projection. `getAfter()`/`existsAfter()` can validate the post-commit state of documents in the same atomic batch.

## Decision
Use `ratings/{ratingId}` as the canonical opinion/review object. The `ratingId` document ID is the durable identity for review links, ranking, comparison context, companion tags, unlisted shares, and future privacy transitions.

Use `posts/{ratingId}` as the interim public feed/review projection for public Ratings only. Posts keep public-surface engagement state such as likes, bookmarks, and comments, plus denormalized display fields for the current Feed/Post screens. Review links reference `ratingId`, never `postId`.

Public Rating creation mints `ratingId`, uploads media, then atomically writes `ratings/{ratingId}` and `posts/{ratingId}`. Firestore rules must validate the public projection with `existsAfter()`/`getAfter()` against `ratings/{ratingId}` so the same batch can be accepted. Do not replace this with `get()`.

Use `userId` as the owner field on both Rating and Post projection. Do not introduce `authorUid` for this boundary, even though other Friends/social code may use `*Uid` names, because existing Ratings already use `userId` and the projection should match the canonical object.

Stop new canonical writes to `reviews`; keep `reviews` only as legacy read/migration data until a later cleanup.

Store Rating media paths under `ratings/{ratingId}/...` as canonical persisted references. Do not persist Firebase download URLs in new Rating/Post documents. UI may resolve paths to temporary URLs at render time.

Use canonical Storage reads for public and owner access in beta: allow reads when the Rating is public or owned by the requester. Defer conversation-share-gated Storage reads until the unlisted share slice. Accept the per-image Firestore lookup cost for beta rather than creating public media copies or persisting token-bearing URLs.

## Consequences
- Public review creation has Firestore atomicity for `ratings/{ratingId}` and `posts/{ratingId}`.
- Private/unlisted Ratings do not create public Post projections.
- Existing Feed/Post screens can keep reading `posts` during the interim client-owned projection phase.
- Engagement belongs to the public projection, not to the private Rating.
- Future unlisted review sharing can grant access against `ratings/{ratingId}/shares/{conversationId}` without changing link identity.
- Future backend feed projection can replace `posts` with `feedItems` without changing review-link identity.
- Storage media access can be revoked by changing Rating visibility/share state, because persisted documents store paths rather than token-bearing URLs.
- Public feed media pays a beta-time rule lookup cost. If this becomes a measured bottleneck, a backend/public-copy/CDN projection can be introduced later without changing Rating identity.
- Existing random-ID `reviews`, `ratings`, and `posts` are not migrated by this decision; migration/cleanup is separate work.
