---
number: 2
title: "PRD: Expo standard compliance hardening"
labels:
  - ready-for-agent
state: open
created_at: 2026-06-04
---
## Problem Statement

Rounds works as a Friends-first Expo Router app, but the current implementation only partially follows the Expo UI and project standards. Users can discover Venues, create Ratings, browse Feed activity, plan in Friends, share Venue links and Review links, and view Profiles, but the app still carries prototype-era native UI debt: package version mismatches, legacy audio and icon dependencies, JavaScript tab chrome, globally hidden headers, custom page-title text, inconsistent automatic content insets, stale route and entry scaffolding, route files that own too much Firestore/business logic, many deep relative imports, and older React Native styling patterns.

This creates user-facing risk and developer risk. Users may see clipped content, inconsistent keyboard behavior, less native navigation, less polished action feedback, and platform-specific rough edges. Developers may keep compounding route-local business logic and styling debt, making future Friends, Feed, Rating, Conversation, Venue, and Profile work harder to test and harder to keep aligned with Expo updates.

The current audit found that the prior native UI hardening effort made real progress, but strict Expo-standard compliance remains incomplete. `expo-doctor` currently fails because required peer dependencies and SDK-compatible package versions are not aligned. Several scroll/list routes still miss automatic content insets. The app still uses Ionicons broadly, `expo-av` for voice, `Platform.OS`, many custom headers, and route-local data composition.

## Solution

Ship a focused Expo standard compliance hardening program that preserves existing Rounds product behavior while bringing the app shell, dependencies, navigation, route layout, platform adapters, styling, and tests closer to the current Expo standard.

From the user's perspective, Rounds should keep the same core surfaces — Friends, Feed, Add, List, Profile, Conversation, Venue detail, Rating creation, Post detail, search, onboarding, and user Profiles — but feel more native and resilient. Content should respect safe areas, native headers, keyboards, tabs, and device sizes. Actions should use consistent iconography, feedback, modals/sheets, and link affordances. The app should remain Expo Go-first unless a documented dependency requires otherwise.

From the developer's perspective, this should be a staged hardening pass, not a broad product redesign. The implementation should extract deeper testable modules around navigation metadata, route layout contracts, platform services, icon rendering, voice/audio, and screen view-models. Route files should become thinner composition layers. Existing canonical domain decisions must remain intact: Rating is the canonical opinion identity, Post is the public projection, Friends remains the hero planning surface, and Cohort isolation must hold across Venue lists, Ratings, Comparisons, and Personal Ranking.

## User Stories

1. As a signed-in user, I want Friends to remain the first and default authenticated tab, so that planning nights out stays central to Rounds.
2. As a signed-in user, I want Feed, Add, List, and Profile to keep their accepted roles, so that native hardening does not scramble familiar navigation.
3. As a new user, I want onboarding screens to respect safe areas and keyboards, so that sign-up feels reliable on my phone.
4. As a returning user, I want login to respect safe areas and keyboards, so that email/password entry is comfortable.
5. As a user, I want every scrollable route to handle safe area and native content insets automatically, so that content is not clipped by headers, tabs, notches, or the home indicator.
6. As a user, I want list routes to handle automatic content insets, so that Feed, Friends, List, Add, Search, User Profile, and onboarding lists scroll naturally.
7. As a user, I want custom fake header padding removed, so that page spacing feels consistent across devices.
8. As a user, I want native stack titles where appropriate, so that screen titles, back behavior, and large-title scrolling feel native.
9. As a user, I want custom title text to remain only when it serves product content rather than navigation chrome, so that pages feel less prototype-like.
10. As a user, I want back buttons and modal close actions to follow platform conventions, so that I can predict navigation.
11. As a user, I want Add to continue opening Rating entry quickly, so that I can rate a Venue without navigating to a blank placeholder.
12. As an iOS user, I want the tab bar to use native tab behavior where possible, so that Rounds feels like an iOS app.
13. As an Android user, I want tab navigation to stay stable and clear, so that iOS polish does not degrade Android behavior.
14. As a user, I want tab icons and labels to remain consistent, so that I can identify Friends, Feed, Add, List, and Profile quickly.
15. As a user, I want icons across actions to share one design language, so that controls feel coherent.
16. As an iOS user, I want SF-symbol-oriented icons where supported, so that common actions match platform conventions.
17. As a user on any platform, I want icon fallbacks to work, so that native icon choices do not create missing controls.
18. As a user, I want image and media rendering to stay smooth, so that avatars, Review photos, chat photos, and profile photos load consistently.
19. As a Conversation user, I want voice-note playback and recording to continue working after the audio dependency is modernized, so that chat planning tools do not regress.
20. As a Conversation user, I want the composer to respect keyboard and bottom safe areas, so that message input is never hidden.
21. As a Conversation user, I want message actions to stay available through a native-feeling action surface, so that chat history stays readable.
22. As a Conversation user, I want destructive actions to be clearly labeled and confirmation-backed, so that I do not delete or report by accident.
23. As a Friends user, I want friend requests to expand, collapse, accept, and decline reliably, so that social planning state is trustworthy.
24. As a Friends user, I want conversation rows to have clear primary navigation and secondary hide actions, so that inbox use is fast and safe.
25. As a Friends user, I want create-chat controls to feel native, so that group planning feels polished.
26. As a user creating a Group Chat, I want member selection, selected counts, disabled states, and empty states to remain clear, so that I can create groups confidently.
27. As a user viewing Group info, I want members, admin state, add members, and leave flow to remain accessible, so that group management stays safe.
28. As a user sharing a Venue to chat, I want the picker and preview to respect safe areas and native navigation, so that sharing feels like a real app flow.
29. As a user sharing a Review to chat, I want the preview to preserve Rating identity and visibility, so that I know exactly what I am sending.
30. As a Feed user, I want posts to keep actor, verb, Venue, metadata, media, Rating badge, and engagement actions, so that public activity remains useful.
31. As a Feed user, I want like, comment, share, and save controls to give clear feedback, so that engagement feels responsive.
32. As a Feed user, I want long-press or preview affordances where appropriate, so that post navigation and sharing feel richer.
33. As a Post detail user, I want comments, share, media, and canonical Review content to respect native layout and keyboard, so that discussion is comfortable.
34. As a List user, I want Venue search and Cohort filters to remain visible and usable, so that discovery is fast.
35. As a List user, I want Cohort isolation preserved in filtering and Personal Ranking display, so that rankings stay meaningful.
36. As a Venue detail user, I want hero, address, stats, tags, hours, popular posts, bookmark, share, directions, website, report, and Rate CTA to stay clear, so that the page is useful.
37. As a Venue detail user, I want address and important metadata selectable/copyable where appropriate, so that I can use details outside Rounds.
38. As a user reporting a miscategorized Venue, I want a native modal or sheet route, so that reporting feels intentional.
39. As a Rating author, I want sentiment selection to provide clear visual and tactile feedback, so that I know my Rating state.
40. As a Rating author, I want photo picking to keep working in Expo Go, so that I can attach Review photos without a custom build.
41. As a Rating author, I want Review Companion selection to stay clear and accessible, so that companion tags are trustworthy.
42. As a Rating author, I want notes and preview to avoid the keyboard, so that submitting a Rating is low friction.
43. As a Profile user, I want username, member-since copy, follower/following stats, rank status, Your list, suggestions, edit, and share controls to remain readable, so that identity and Personal Ranking context are clear.
44. As a user viewing another Profile, I want Follow Graph and Friendship actions to remain separate, so that I understand public follows versus private planning relationships.
45. As a user viewing another Profile, I want Report and Block actions to remain clearly destructive or safety-related, so that I can act safely.
46. As a search user, I want people search to use native-safe layout and keyboard behavior, so that usernames are easy to find.
47. As a user, I want important numbers to align with tabular numeric styling, so that stats and counts are easier to scan.
48. As a user, I want subtle state-change animations for expansion, selection, empty states, and sent/liked/bookmarked feedback, so that Rounds feels alive without being distracting.
49. As an iOS user, I want haptics for high-confidence actions, so that selecting, liking, saving, sending, and submitting feel delightful.
50. As a web user, I want haptics and native-only features to degrade safely, so that web export remains usable.
51. As an Expo Go tester, I want the app to run without custom builds unless there is a documented blocker, so that iteration stays fast.
52. As a QA tester, I want `expo-doctor` to pass, so that dependency drift is visible before beta testing.
53. As a QA tester, I want unused or stale Expo entry scaffolding removed or clearly neutralized, so that the real app entry is obvious.
54. As a developer, I want dependency versions aligned to the installed Expo SDK target, so that native modules do not crash outside Expo Go.
55. As a developer, I want legacy audio APIs replaced with the current Expo audio API, so that voice-note work is not blocked by deprecated packages.
56. As a developer, I want icon rendering behind a stable adapter, so that switching native icon strategies does not touch every route.
57. As a developer, I want platform checks behind a small platform service, so that iOS-only haptics and behavior do not rely on scattered platform conditionals.
58. As a developer, I want navigation metadata centralized, so that tab order, titles, roles, modal presentation, and hidden routes are testable.
59. As a developer, I want route layout contracts centralized, so that new screens cannot easily reintroduce missing automatic content insets.
60. As a developer, I want route files to be thin composition layers, so that Firestore, Storage, Functions, and business logic live behind service seams.
61. As a developer, I want Feed data composition behind a testable view-model or service, so that public Post display behavior can be tested outside routes.
62. As a developer, I want Friends inbox display and mutations behind tested services/view-models, so that Conversation previews and friend-request behavior remain stable.
63. As a developer, I want Venue detail display data behind a testable view-model, so that stats, tags, open/closed status, and popular posts render consistently.
64. As a developer, I want Rating composer state behind a testable reducer or view-model, so that sentiment, photos, companions, notes, preview, and submit disabled state are reliable.
65. As a developer, I want Profile and User Profile display logic behind tested modules, so that Follow Graph and Friendship state separation remains explicit.
66. As a developer, I want path aliases configured before broad refactors, so that route and component imports stop depending on fragile deep relative paths.
67. As a developer, I want reusable UI primitives named and organized consistently, so that future UI work can find and reuse them.
68. As a developer, I want kebab-case reusable file names as touched files move, so that project structure follows the UI standard.
69. As a developer, I want styling migration to avoid churn-only rewrites, so that compliance improves without creating unreviewable diffs.
70. As a developer, I want tests to assert visible behavior and contracts rather than private styling implementation, so that native component changes remain possible.
71. As a developer, I want source-level compliance tests only where behavior cannot be easily rendered in Jest, so that tests remain useful rather than brittle.
72. As a maintainer, I want a documented exception if NativeTabs cannot preserve Add behavior, so that future agents understand why JavaScript tabs remain.
73. As a maintainer, I want a documented exception if a dependency must remain for Firebase auth persistence or platform support, so that compliance work does not remove required functionality.
74. As a maintainer, I want no new Firestore document shapes in this PRD, so that UI hardening does not create backend migration risk.
75. As a maintainer, I want existing Ratings, Posts, Conversations, Friendships, Friend Requests, Blocks, Comparisons, and Personal Rankings preserved, so that domain contracts do not drift.
76. As a maintainer, I want the implementation to read versioned Expo docs before changing Expo code, so that syntax matches the installed SDK and project target.
77. As a maintainer, I want manual QA to start in Expo Go, so that custom native build complexity is avoided unless necessary.
78. As a maintainer, I want web export verification after hardening, so that Expo Router and platform fallbacks remain healthy.
79. As a beta user, I want Rounds to feel more native without a major redesign, so that the product becomes more trustworthy while staying familiar.
80. As a future agent, I want this PRD broken into agentable slices, so that compliance work can progress without reopening completed native UI work.

## Implementation Decisions

1. Treat this PRD as remaining Expo-standard compliance after prior native UI hardening, not as a full visual redesign.
2. Preserve existing product behavior across Friends, Feed, Add, List, Profile, Conversation, Venue detail, Rating creation, Post detail, search, onboarding, and user Profiles.
3. Keep Friends as the hero authenticated destination. Do not reintroduce Ranking or Leaderboard as primary navigation.
4. Keep Rating as canonical opinion identity and Post as public projection. UI hardening must not create a new Review data model.
5. Keep City and Cohort isolation intact across Venue lists, Ratings, Comparisons, and Personal Ranking.
6. First align dependencies with the installed Expo SDK target and make `expo-doctor` pass. Current known failures are missing `expo-font`, mismatched AsyncStorage package version, and legacy/mismatched `expo-av`.
7. Replace deprecated voice/audio usage with the current Expo audio API through a deep audio adapter that exposes simple recording and playback operations for Conversation voice notes.
8. Keep Expo Go as the default runtime path. If implementation discovers a real Expo Go blocker, document it and stop before requiring custom builds.
9. Evaluate migration from JavaScript tabs to native tabs using version-compatible Expo Router APIs. If native tabs cannot preserve Add-as-modal behavior without introducing a blank primary route, keep JavaScript tabs behind a documented exception and tests.
10. Extend the navigation shell module into a deeper contract that owns tab order, route roles, labels, icon semantics, default authenticated destination, modal/sheet presentation intent, native title metadata, hidden-route policy, and search/header capability.
11. Use stack layout files to own native stacks. Prefer importing stack primitives from the native stack entry point recommended by Expo Router for the installed SDK.
12. Move route page titles into stack options where route ownership supports native titles. Custom page-title text should remain only when it is product content or when a route has a documented custom-header exception.
13. Use native header search for people search and Venue list search where it improves iOS behavior without harming Android/web. Custom search remains allowed behind a documented cross-platform exception.
14. Standardize route roots through a route layout contract: scrollable screens use inset-aware scroll/list primitives; composer-heavy screens explicitly handle safe area and keyboard; loading/not-found states use shared centered containers.
15. Finish automatic content inset adoption on remaining scroll/list routes discovered by audit: Friends, List, Add, Edit Profile, onboarding list/scroll pages, Post detail, Search, and User Profile.
16. Remove fake header spacing and manual top padding wherever native headers, automatic content insets, or safe-area containers should own spacing.
17. Add or refine shared UI primitives for screen containers, inset-aware scroll/list roots, cards, rows, buttons, icon buttons, empty states, stat blocks, copyable/selectable text, media thumbnails, and loading/not-found states.
18. Keep primitives deep enough to encode behavior, accessibility, native layout, and platform fallbacks, but shallow enough to avoid hiding domain-specific copy or data decisions.
19. Add a semantic icon adapter that maps product actions to platform-preferred symbols and fallbacks. Prefer the Expo image/SF-symbol strategy on iOS where supported and keep cross-platform fallback behavior centralized.
20. Avoid direct broad usage of Ionicons in route and feature components after the adapter lands. Migration can be staged screen-by-screen.
21. Use the existing Expo image media adapter for images and expand its use only where gaps remain. Do not reintroduce core image usage.
22. Add a platform service that exposes platform booleans and guarded haptic helpers. Replace scattered platform checks as touched.
23. Use iOS-only haptics for high-confidence actions: Add entry, sentiment selection, Rating submit, companion chip select, Feed like/save, bookmark toggle, message send, reaction selection, friend request accept/decline, and destructive confirmations.
24. Add subtle entering, exiting, or layout animations for existing state changes: expanded friend requests, selected chips, empty states, reaction bars, poll composer, reply composer, and report/sheet presentation. Keep animations conservative and test-stable.
25. Prefer modern shadow styling and continuous rounded corners in new or refactored UI primitives. Avoid broad churn-only style rewrites.
26. Prefer inline styles for simple one-off refactors only when it improves clarity; shared primitives may keep centralized styles when reuse is meaningful.
27. Add tabular-number presentation to counters and stats where visible to users, including Feed metrics, Profile stats, Venue stats, ranking numbers, selected counts, and voice duration.
28. Configure project path aliases before broad route/component refactors. Prefer aliases over deep relative imports for touched files.
29. Convert reusable component file names to kebab-case as files are touched or moved. Avoid route churn unless the route is intentionally restructured.
30. Remove or neutralize stale non-router app scaffolding that is no longer the app entry, so contributors see the real Expo Router entry path.
31. Extract route-local business logic into service seams and view-model modules. Route files should compose auth, params, navigation, and UI; Firestore/Storage/Functions access should be behind existing or new services.
32. Feed extraction should preserve public Post query behavior, followed-user promotion, city scoping, Review media display, engagement state, and Review share params.
33. Friends extraction should preserve Friend Request actions, Conversation previews, hidden conversation state, create-chat navigation, and safety-sensitive interaction boundaries.
34. Venue detail extraction should preserve fallback visuals, address formatting, open/closed status, average score, tags, popular posts, bookmark state, share params, external link actions, and report payload intent.
35. Rating composer extraction should preserve sentiment, notes, local photos, Review Companion tags, preview, submit disabled state, public visibility, Rating creation with Post projection, and post-submit comparison prompt.
36. Profile extraction should preserve own-profile stats, Personal Ranking display, suggested-user UI, copyable metadata, edit/share actions, and sign-out action.
37. User Profile extraction should preserve public profile lookup, follow/unfollow, Friend Request state machine, direct message route params, report, block, public/private Rating filtering, and visible stats.
38. Conversation extraction should preserve text, photos, polls, voice notes, one-time location pins, Venue links, Review links, reactions, reply quotes, hide/delete/report actions, and membership-gated behavior.
39. Move modal-like report/edit flows toward route-backed modal or sheet presentation where it improves native behavior. Keep existing simple Modal only if route conversion would create disproportionate risk, and document the exception.
40. Add Link-based navigation with previews and context menus for high-value navigable objects where supported: Venue rows, Feed posts, user rows, inbox rows, popular posts, Venue link cards, and Review link cards. Keep fallback press navigation for platforms that do not support previews/menus.
41. Preserve accessibility labels and roles for primary actions, destructive actions, copyable text, disabled controls, counters, and inputs.
42. Do not introduce new Firestore document shapes, Storage path rules, or Cloud Function contracts in this PRD.
43. Do not change security-sensitive social mutation ownership. Trusted Function boundaries remain where already required by ADRs.
44. Do not upgrade the whole Expo SDK as part of this PRD unless maintainers explicitly select an SDK upgrade slice. This PRD aligns the current installed SDK and documents any future SDK-target blockers.
45. Read versioned Expo documentation before implementation and record any version-specific API decisions that affect navigation, native tabs, audio, icons, haptics, or sheets.
46. Break implementation into tracer-bullet slices: dependency doctor, route layout/insets, navigation/header/title, icon/platform adapters, audio adapter, route view-model extraction, native link/menu polish, haptics/animations, and final verification.

## Testing Decisions

1. Tests should assert external behavior, visible copy, navigation contracts, accessibility affordances, and data contracts; avoid testing private component state or pixel-perfect style details.
2. Existing source/UI hardening tests are prior art for route layout contracts, automatic content inset adoption, modal presentation, copyable text, and native UI wiring.
3. Existing navigation shell tests are prior art for tab order, tab labels, Add entry route, hidden routes, default authenticated route, and icon metadata.
4. Existing Friends service tests are prior art for Friend Request, Friendship, Conversation, safety, link, poll, photo, location, voice, reaction, and reply behavior.
5. Existing media adapter tests are prior art for testing normalized media source behavior without coupling to every rendered image.
6. Add a dependency/compliance verification test or script wrapper that fails when `expo-doctor`-covered mismatches return after dependency hardening.
7. Add tests for navigation shell extensions: native title metadata, route roles, modal/sheet intent, search/header capabilities, hidden-route exceptions, and documented JavaScript-tab exception if native tabs cannot preserve Add behavior.
8. Add tests for route layout contracts on remaining screens that were not covered by previous safe-area cleanup: Friends, List, Add, Edit Profile, onboarding list/scroll screens, Post detail, Search, and User Profile.
9. Add tests for the platform service: iOS haptic calls are guarded, non-iOS/web no-op safely, and platform checks have stable behavior under test.
10. Add tests for the icon adapter: semantic actions resolve to expected native symbol names and cross-platform fallbacks without requiring route components to know icon libraries.
11. Add tests for the audio adapter with mocked Expo audio APIs: recording start/stop, playback start/stop, duration reporting, cleanup, error handling, and no direct dependency on deprecated audio APIs.
12. Add tests for Feed view-model/service behavior: city scoping, followed-user promotion, elapsed-time display input, Venue fallback lookup, engagement flags, and share params.
13. Add tests for Friends inbox behavior: empty state, request count, expanded request actions, disabled mutation states, conversation preview copy, hide action, and create-chat navigation target.
14. Add tests for Venue detail behavior: fallback visual data, address copyability, external action availability, bookmark state, score formatting, tags/hours display, popular post rows, Rate CTA, share params, and report intent.
15. Add tests for Rating composer reducer/view-model behavior: sentiment selection, photos added/removed, companion toggles, notes, preview fields, submit disabled/enabled, and comparison prompt threshold behavior.
16. Add tests for Profile behavior: copyable username/member-since, follower/following/rank status stats, Your list empty/ranked states, suggested user dismissal, edit/share actions, and sign-out action label.
17. Add tests for User Profile behavior: public profile lookup outputs, follow state, Friendship CTA labels/actions, direct message target, report/block labels, public/private Rating filtering, and separate Follow Graph versus Friendship behavior.
18. Add tests for Conversation behavior only at stable seams: composer disabled/sending state, attachment actions, message action menu availability, reply quote presence, reaction display, and safe destructive labels.
19. Add tests for copyable/selectable text where important data or error messages are shown, especially Venue address, usernames, handles, member-since metadata, debug redirect URI, and user-facing errors.
20. Add tests for tabular counters only where a source-level assertion is the least brittle way to guard them. Do not snapshot-test all styles.
21. Keep Firestore rules tests unchanged unless implementation changes an existing read/write path. This PRD should not require new schema or rules tests.
22. Run targeted red/green tests before each slice implementation, then run full Jest after each slice.
23. Run `expo-doctor` after dependency and package changes and treat failure as a blocker unless a documented exception is approved.
24. Run Expo Go manually before custom builds. Manual QA should cover iOS Expo Go first, then Android Expo Go if available, then web export.
25. Run web export after navigation, icon, audio, and route-layout changes to catch platform fallback regressions.
26. Manual QA should cover compact phone, large phone, keyboard-heavy flows, tab transitions, modal/sheet flows, chat composer, photo picking, voice note interaction, sharing Venue/Review to chat, and search.
27. Testing should preserve existing domain behavior: Rating/Post identity, Friends privacy, Group Chat membership, Block safety, Cohort isolation, and Personal Ranking calculations.

## Out of Scope

- Full product redesign or new visual brand direction.
- Reordering the primary tabs or making Feed the hero surface again.
- Reintroducing Leaderboard/Rank as a primary tab.
- Adding new Friends product behavior, chat attachment types, or planning tools.
- Adding new Venue providers, event recommendations, reservations, crowd reports, or booking flows.
- Changing Rating, Post, Review, Comparison, Personal Ranking, Friendship, Friend Request, Conversation, Group Chat, Block, or Follow Graph document shapes.
- Moving public Feed projection ownership to backend workers.
- Changing trusted Cloud Function boundaries for sensitive social mutations.
- Full Expo SDK major upgrade unless selected as a separate upgrade slice.
- Full dark mode or theme rewrite.
- Pixel-perfect Apple Human Interface Guidelines audit across every screen.
- Accessibility certification-level audit; this PRD improves basics but does not claim exhaustive compliance.
- Native module authoring or custom native build creation unless implementation documents a real Expo Go blocker and maintainer approves.
- Rewriting all styles solely to remove `StyleSheet.create` or margins; style compliance should improve where touched and through shared primitives.
- Rewriting all route files in one large diff. Route thinning should be staged through tested seams.

## Further Notes

Current audit summary:

- `npx expo-doctor` passed 16 of 18 checks and failed on missing `expo-font`, mismatched `@react-native-async-storage/async-storage`, and mismatched legacy `expo-av`.
- The app uses Expo Router and has a `/` route through the root index route.
- Prior native UI hardening tests pass and confirm some automatic inset and modal improvements.
- JavaScript tabs remain in use; native tabs were previously deferred because preserving center Add behavior was a sharp edge.
- Root and onboarding stacks hide headers globally, causing many routes to own custom title text and spacing.
- Remaining scroll/list routes without automatic content inset coverage include Friends, List, Add, Edit Profile, onboarding city/preferences/Spotify, Post detail, Search, and User Profile.
- Ionicons remain widespread, including app-level action icons and reusable row/icon primitives.
- Voice note code still uses `expo-av`; the current standard prefers the newer Expo audio API.
- Several routes still use platform checks directly instead of a shared Expo-platform service.
- Route files still contain substantial Firestore querying, mutation orchestration, display derivation, and inline UI component definitions.
- No project path alias config was present during audit; many imports use deep relative paths.
- Component file names still include PascalCase names; convert reusable files to kebab-case as touched.
- The app already uses an Expo image adapter for many media surfaces; keep and extend that seam instead of replacing it.
- Stale root app scaffolding exists even though Expo Router owns the app entry; cleanup should avoid changing runtime entry accidentally.

Recommended slice order:

1. Dependency doctor and stale entry cleanup.
2. Remaining automatic inset and keyboard-safe route layout cleanup.
3. Navigation stack/header/title/search contract cleanup.
4. Native tabs evaluation and documented tab exception or migration.
5. Icon adapter and platform/haptics service.
6. Audio adapter migration for voice notes.
7. Route view-model/service extraction for Feed, Friends, Venue, Rating, Profile, User Profile, and Conversation seams.
8. Link previews/context menus, sheet routes, subtle haptics, and animations.
9. Final Expo Go QA, web export, full Jest, `expo-doctor`, and handoff.
