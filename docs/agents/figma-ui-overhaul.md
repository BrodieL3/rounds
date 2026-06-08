# Figma UI Overhaul Slice

Status: READY FOR IMPLEMENTATION — owner decisions captured in ADR 006. Use TDD. Do not commit secrets.

## Source of truth

- Figma file: `Rounds`, file key `8CcbpAdt4AMYS9hulRy15n`, page node `0:1`.
- Durable domain docs: `CONTEXT.md`; ADRs `003`, `004`, `005`, `006`.
- Expo target: SDK 54 (`expo ~54.0.0`). Use SDK 54 docs and Expo Go as first sanity check.
- Product language: use `Discover`, not `Feed`, in new user-facing UI. Legacy feed modules may remain as implementation seams during migration.

## Accepted owner decisions

1. Figma `Discover` replaces current user-facing `Feed` surface.
2. Bottom nav choice is implementation-owned: choose the simplest route that matches Figma icon-only feel and works in Expo Go/SDK 54. If using JS tabs/custom nav, document why. Do not force NativeTabs if it blocks the plus drawer behavior.
3. Keep SDK 54. Do not upgrade Expo SDK for this overhaul.
4. Delete/rebuild frontend auth/onboarding for simplicity. Future auth plans are separate.
5. Do not block on LINE Seed JP. Use a modern system sans-serif that fits Heroicons/Figma feel.
6. Plus Menu opens as drawer/sheet from anywhere with actions: create group chat, rate a venue, create a post.
7. Blank Figma areas should use placeholders informed by existing data where obvious; leave empty where unsure.
8. Chat uses the real Apple/native keyboard. Attachments/extensions (polls, reviews, GIFs, images, etc.) replace the keyboard area and use the same vertical space.

## Goal

Replace current frontend with Expo implementation matching the Figma design language, while reconnecting Firebase behavior behind service seams at the end.

Successful end state:

1. Current frontend route/component chrome is deleted or rewritten.
2. Figma screens exist in Expo: Friends, Discover, Plus Menu, My List, Profile, Chat.
3. Placeholder-filled blank spaces use existing data where the intended future data role is clear.
4. Firebase Auth/Firestore/Storage/Functions wiring works through `lib/**` seams or new equivalent seams after auth plans are reintroduced.

## Figma design inventory

Shared frame/spec:

- Device frame: `402 x 874`.
- Background: `#F0F0F0`.
- Hero/accent blue: `#084EB8`.
- Text: `#111827`.
- Placeholder gray: `#D9D9D9`, secondary grays `#A0A0A0`, `#B9B9B9`.
- Font: modern sans/system fallback acceptable.
- Top title y ≈ 68, bottom nav icons y ≈ 810.

Frames:

- `Friends`: title + pencil icon; bottom nav selected Friends; avatar/conversation placeholders from existing Friends data.
- `Plus Menu`: dimmed current-surface backdrop, bottom sheet from y≈437, handle, three 76x76 hero-blue action tiles for group chat, rate venue, create post.
- `Discover`: title + search icon; placeholder public activity/venue discovery data from current posts/venues.
- `List`: title `My List` + filter icon; placeholder saved/rated venues from existing data.
- `Profile`: centered avatar, share/dots actions, name + username; placeholder profile stats/list where clear.
- `Chat`: back button, group avatar stack, `Group Chat`, composer, camera/grid/mic/send; native keyboard or keyboard-height extension tray.

## Scope boundaries

Delete/rewrite after tests exist:

- `app/**`
- `components/**`
- `hooks/**`
- `contexts/**`
- stale frontend entry scaffolding such as `App.js` / `index.js` if verified unused

Preserve/adapt, not blind-delete:

- `lib/firebase.js`, `lib/firebase-emulators.js`
- `lib/friends/**`, `lib/ratings/**`, `lib/feed-*`, `lib/ranking*`, `lib/media-*`
- `functions/**`, `firestore.rules`, `storage.rules`, emulator/rules tests
- `assets/venues.json` and Firebase/domain test fixtures

Already decided/started as prep:

- `lib/constants.js` should carry Figma colors.
- User-facing nav config/tests should use Discover label.
- `.gitignore` should exclude local MCP/agent worktree files.

## Implementation plan

### 0. Protect repo state

- Check `git status --short` before changes.
- `mcp.json`, `.claude/worktrees/`, and `scripts/friends-seed.js` are local-only ignores. Do not commit them.
- Redact/rotate any real Figma token that appeared in local config.

### 1. Extract precise design data

- Use Figma MCP per frame with needed depth.
- Download SVG icons/assets only where Expo/SF/Ionicon equivalents cannot match.
- Create `docs/design/figma-rounds-ui.md` with final tokens, spacing, frame notes, and placeholder choices.

### 2. Write contract tests before purge

Add/adjust tests for:

- Design tokens.
- Navigation model: Friends, Discover, Plus drawer, My List, Profile, Chat.
- Plus menu action targets: group chat, rate venue, create post.
- No frontend auth/onboarding dependency in rebuilt UI shell.
- Firebase view-model seams for Friends, Profile, Chat, List/ratings, Discover/posts.
- No direct Firestore/Storage/Functions logic inside route screens beyond service hooks/adapters.

### 3. Purge/rebuild frontend shell

- Delete old route screens/components once contract tests exist.
- Recreate minimal Expo Router shell with root layout and Figma app shell.
- Keep route files thin: compose view-models + presentational components only.
- Implement plus drawer as route-backed sheet/modal or custom drawer, whichever best preserves Figma and Expo Go.

### 4. Build Figma UI primitives

Suggested primitives:

- `rounds-screen` container with Figma bg and safe-area handling.
- `top-bar` title/action row.
- `bottom-nav` icon-only nav or tab adapter.
- `figma-icon` semantic icon wrapper using Heroicons-like outline/solid mappings.
- `avatar-placeholder` and `avatar-stack`.
- `plus-action-sheet`.
- `keyboard-extension-tray`.
- `chat-composer`.

### 5. Build visual screens first

Order:

1. Friends
2. Plus Menu
3. Discover
4. My List
5. Profile
6. Chat

Use fixture/minimal live data to validate layout. Mark uncertain placeholder decisions in `docs/design/figma-rounds-ui.md`.

### 6. Reconnect Firebase

- Friends: conversations, friend requests, hide state through `lib/friends/**`.
- Chat: messages, attachments, reactions/replies/voice/photo/location through existing services.
- Group creation/lifecycle: Functions boundary remains per ADR 004.
- Ratings/reviews/list: canonical `ratings/{ratingId}` and `posts/{ratingId}` per ADR 005.
- Discover: may reuse current `posts` public projection and feed view-model during interim, but user-facing copy says Discover.
- Storage: keep path-based media access; do not persist download URLs.
- Auth: rebuild later per owner plan; keep Firebase wiring viable, but do not preserve old auth frontend for this slice.

### 7. Verify

Required before implementation handoff/merge:

- Targeted Jest red/green per slice.
- `npm test`.
- `npm run test:rules` if Firebase paths touched.
- `npx expo-doctor`.
- `npx expo export --platform web`.
- Manual Expo Go pass on SDK 54: Friends, Plus drawer, Discover/List/Profile, Chat composer/keyboard/extension tray, Firebase emulator or approved real env.

## Fresh-agent start checklist

1. Read `CONTEXT-MAP.md`, `AGENTS.md`, this file, `CONTEXT.md`, ADRs `003`–`006`.
2. Fetch Figma data for file key `8CcbpAdt4AMYS9hulRy15n`, node `0:1`.
3. Review dirty worktree; do not clobber local ignored files.
4. Implement with TDD from this plan.
