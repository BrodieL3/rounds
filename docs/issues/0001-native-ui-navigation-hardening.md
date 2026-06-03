---
number: 1
title: "PRD: Native UI and navigation hardening"
labels:
  - ready-for-agent
state: open
created_at: 2026-06-03
---
## Problem Statement

Rounds has a coherent Friends-first mobile prototype, but much of the UI is still built as custom React Native screens rather than as an Expo Router app that fully uses native navigation, platform insets, native tab behavior, and Apple Human Interface Guidelines. Users can move through Friends, Feed, Add, List, Profile, venue detail, review creation, chat, and profile flows, but they experience avoidable rough edges: manually padded headers, custom titles, non-native tab chrome, always-visible chat message controls, inconsistent safe-area behavior, limited native previews/menus, icon and media libraries that drift from current Expo guidance, and layout patterns that are more fragile across iPhone sizes, tablets, Android, and web export.

This matters because Friends is now the hero surface for coordinating nights out. If the shell feels prototype-like, users will trust the chat, venue sharing, review links, and planning tools less, even when the underlying behavior works. The app needs a focused UI hardening pass that preserves the current Friends-first product behavior and visual baseline while making the navigation, safe areas, icons, media rendering, actions, and responsiveness feel more native and beta-ready.

## Solution

Ship a native UI and navigation hardening slice that keeps the current five-tab product model — Friends, Feed, Add, List, Profile — and improves the app shell around the existing MVP. Users should see the same core product surfaces, but with native tab behavior, native stack titles where appropriate, better safe-area and keyboard handling, cleaner action placement, stronger responsive list behavior, platform-appropriate icons/media, and fewer prototype-only controls.

The implementation should prioritize low-risk infrastructure and presentation improvements before broad visual redesign. Existing Friends, Feed, Add, List, Profile, Conversation, Venue, Rating, Post, and Profile behavior should continue to work. The slice should introduce reusable UI primitives and view-model helpers where repeated screen-local patterns exist, so later feature work can use a deeper, testable UI foundation instead of duplicating header, row, card, icon, media, and action code.

## User Stories

1. As a signed-in user, I want Friends to remain the first tab, so that planning with people stays the center of Rounds.
2. As a signed-in user, I want Feed, Add, List, and Profile to remain in the accepted order, so that existing product navigation stays recognizable.
3. As a user, I want the tab bar to feel native on my device, so that the app feels polished rather than custom-built around a prototype shell.
4. As an iOS user, I want tab icons and labels to match platform conventions, so that navigation feels familiar.
5. As an Android user, I want tab navigation to remain usable and clear, so that native iOS polish does not harm Android behavior.
6. As a user, I want the center Add action to remain easy to find, so that rating a visited Venue stays low friction.
7. As a user, I want each major screen to have native navigation titles where possible, so that headers behave consistently across scrolling, back navigation, and safe areas.
8. As a user, I want screen content to avoid the notch, home indicator, keyboard, and tab bar automatically, so that no controls are clipped or awkwardly padded.
9. As a user with a smaller phone, I want Friends, Feed, List, Profile, Venue detail, and Conversation screens to remain readable, so that I can use Rounds on compact devices.
10. As a tablet user, I want lists and cards to remain proportionate, so that the app does not feel like a stretched phone mockup.
11. As a user, I want scrolling screens to preserve content under native headers and tabs correctly, so that pull-to-refresh, large titles, and lists feel smooth.
12. As a user, I want Feed rows to keep existing rating-derived activity information, so that public Review activity remains useful.
13. As a Feed user, I want like, comment, share, and save controls to feel like native social actions, so that engagement is clear.
14. As a Feed user, I want media previews to render efficiently and consistently, so that review photos feel reliable.
15. As a Feed user, I want post rows to support useful long-press or context behavior where appropriate, so that sharing and navigation feel richer.
16. As a List user, I want search and cohort filtering to stay easy to use, so that Venue discovery remains fast.
17. As a List user, I want Venue rows to preserve cohort, neighborhood, open/closed status, ranking, and bookmark affordances, so that Personal Ranking context remains clear.
18. As a user viewing a Venue, I want the hero, Website, Directions, Share, bookmark, stats, tags, hours, popular posts, rating CTA, and report affordance to remain visible and better structured, so that the Venue page feels credible enough to share.
19. As a user viewing a Venue address, I want the address to be copyable, so that I can use it outside Rounds.
20. As a user reporting a miscategorized Venue, I want the flow to feel like a real modal or sheet, so that reporting does not look like an inline prototype form.
21. As a user rating a Venue, I want photo, companion, notes, preview, submit, and cancel controls to remain responsive above the keyboard, so that creating a Rating is low friction.
22. As a user rating a Venue, I want sentiment selection to give clear tactile or visual feedback, so that I know my choice was recorded.
23. As a user tagging companions, I want selected companion chips to be clear and accessible, so that Review Companion selection is trustworthy.
24. As a Friends user, I want the empty inbox, friend-request card, create-chat button, and conversation rows to retain their current behavior, so that the hero surface does not regress.
25. As a Friends user, I want pending friend request actions to provide clear disabled and success/failure feedback, so that accepting or declining feels safe.
26. As a Friends user, I want inbox rows to be easy to tap and preview, so that active plans are easy to resume.
27. As a Friends user, I want conversation row actions like hide to be placed in an intentional action pattern, so that the inbox is not cluttered.
28. As a Conversation user, I want message bubbles, attachment cards, reply quotes, reactions, voice notes, polls, location pins, Venue links, and Review links to keep working, so that existing planning tools remain intact.
29. As a Conversation user, I want secondary message actions to appear through a native-feeling long-press menu or action surface, so that chat history is easier to scan.
30. As a Conversation user, I want destructive actions like delete and report to be visually distinct and confirmation-backed where appropriate, so that I do not accidentally damage chat history.
31. As a Conversation user, I want the composer to respect the keyboard and safe areas, so that sending messages is comfortable on all devices.
32. As a Conversation user, I want attachment actions to be discoverable without overwhelming text input, so that planning tools remain usable.
33. As a Conversation user, I want group info access to feel like native navigation, so that group management feels part of the app rather than bolted on.
34. As a user sharing a Venue into chat, I want the conversation picker to feel like a native share destination list, so that sharing feels natural.
35. As a user sharing a Review into chat, I want the review preview and chat picker to remain clear, so that I know what I am sending.
36. As a Profile user, I want follower/following stats, rank status, edit/share actions, and Your list to stay readable, so that my private Personal Ranking and public identity are clear.
37. As a Profile user, I want important profile data like username and member-since information to be selectable where appropriate, so that I can copy useful data.
38. As a user viewing another user's profile, I want Follow, Add Friend, Respond, Friends, Message, Report, and Block states to remain separate and visually clear, so that Friendship and Follow Graph concepts do not blur.
39. As a user, I want icons to look consistent across the app, so that controls have a coherent design language.
40. As a user, I want images to load smoothly and consistently, so that avatars, review photos, Venue thumbnails, and chat photos do not feel flaky.
41. As an iOS user, I want subtle haptics on meaningful actions, so that liking, saving, sending, rating, and selecting feel delightful.
42. As a user, I want counters and stats to align visually, so that Feed metrics, Profile stats, Venue stats, and ranking numbers are easy to scan.
43. As a user, I want state changes such as expanding friend requests, adding reactions, selecting chips, showing empty states, and loading rows to animate subtly, so that the app feels alive without distracting me.
44. As a user, I want Rounds to stay visually stable during the hardening pass, so that the app still matches the accepted early beta screenshots.
45. As a developer, I want reusable UI primitives for cards, rows, icon buttons, empty states, and copyable text, so that screen code becomes thinner and future features ship faster.
46. As a developer, I want navigation configuration centralized behind a small stable interface, so that tab order and titles can be tested without brittle screen assertions.
47. As a developer, I want media rendering behind a small adapter, so that image library changes do not spread through Feed, Profile, Venue, and Conversation screens.
48. As a developer, I want icon rendering behind a small adapter or consistent primitive, so that platform icon changes can happen once.
49. As a developer, I want safe-area and keyboard behavior standardized, so that future route screens do not reintroduce manual header padding.
50. As a developer, I want source/UI tests to assert stable visible behavior, so that native UI hardening does not regress Friends-first product flows.

## Implementation Decisions

1. Preserve the accepted Friends-first navigation model: Friends, Feed, Add, List, Profile. Ranking remains absent from primary navigation.
2. Treat this as a UI hardening slice, not a product behavior rewrite. Existing Friends, Feed, Add, List, Profile, Conversation, Venue, Rating, Post, and Profile behavior should remain intact unless a control is clearly prototype-only or already superseded by product decisions.
3. Replace custom tab chrome with native tab navigation where supported by the current Expo Router stack, while maintaining equivalent route names, labels, and Add entry behavior.
4. Add nested stack ownership for tab surfaces where native titles, native search, and back behavior improve the experience. Root navigation may remain headerless, but tab surfaces should avoid duplicating custom header text when native stack titles can own it.
5. Remove or fully hide deprecated primary navigation remnants rather than keeping unreachable placeholder screens as long-term route debt.
6. Standardize route screen roots: scrollable screens should use a ScrollView, FlatList, or SectionList that adjusts content insets automatically; non-scrollable screens should explicitly handle safe area and keyboard layout.
7. Replace manual top padding used as fake safe-area/header spacing with native stack headers, automatic insets, or a shared screen container primitive.
8. Add a small navigation shell/view-model module that exposes accepted tab order, labels, native icon names, route roles, and hidden-route policy through a stable testable API.
9. Add or refine reusable UI primitives for screen containers, cards, row cells, icon buttons, action buttons, empty states, stat blocks, copyable text, and media thumbnails.
10. Favor deep UI primitives over one-off screen-local style objects where repeated behavior exists. A primitive should encapsulate enough behavior to reduce future screen churn, but not hide product-specific copy or data decisions.
11. Replace legacy shadow/elevation patterns with modern shadow styling supported by the Expo/React Native target.
12. Use continuous border curves for rounded cards and buttons where supported, except for true capsule/pill controls.
13. Migrate general app icons away from Ionicons toward the native/SF-symbol-oriented icon strategy preferred by the Expo UI guidelines. If cross-platform fallback is required, keep it behind an icon primitive.
14. Migrate image rendering away from the core React Native image component toward the Expo image component for avatars, Feed photos, Venue media, Review media, Profile media, and chat photos where practical.
15. Migrate voice playback/recording dependencies away from deprecated audio APIs toward the current Expo audio API before deeper voice UI polish depends on it.
16. Replace platform checks that rely on React Native platform APIs with the Expo-preferred platform environment where practical, especially for haptics and keyboard behavior.
17. Add iOS-only haptics for high-confidence user actions: tab Add, Feed like/save, Rating sentiment select/submit, companion chip select, friend request accept/decline, message send, reaction select, bookmark toggle, and destructive confirmations. Haptics must be guarded so Android/web behavior remains stable.
18. Convert always-visible chat message secondary controls into a native-feeling action surface such as long-press actions, menu, or action sheet. Keep destructive actions distinct.
19. Convert inline modal-like report/edit surfaces into route-backed modal or sheet presentations where appropriate, especially for Venue miscategorization reporting and other future forms.
20. Use Link-based navigation with preview/menu affordances for high-value navigable objects where supported: Venue rows, Feed posts, inbox rows, Venue link cards, Review link cards, user/profile rows, and popular posts.
21. Prefer native header search for major list surfaces when it improves iOS behavior and does not harm Android/web. Custom search can remain where native header search is not a good fit.
22. Keep public Feed activity, Friends planning, List discovery, Add review entry, and Profile personal list separated according to the domain model.
23. Keep Profile `Your list` driven only by Personal Ranking from Comparisons; do not add discovery rows during UI hardening.
24. Keep Rating as the canonical opinion identity and Post as the public projection; UI hardening must not add new Review/Post identity forks.
25. Keep Venue link and Review link chat cards semantically distinct and navigable to their existing destinations.
26. Do not introduce new Firestore document shapes or backend APIs in this slice unless absolutely required by UI state persistence. UI hardening should mostly change presentation and navigation.
27. Add a copyable text primitive or helper for important data such as usernames, handles, Venue addresses, errors, and debug/config values shown to users.
28. Add tabular number styling for visible counters and stats including Feed metrics, Profile stats, Venue stats, ranking numbers, voice duration, and selected counts.
29. Introduce subtle entering, exiting, and layout animations for UI state changes that already exist: expanded friend requests, empty-to-nonempty lists, selected chips, reaction bars, poll composer, reply composer, and report panels.
30. Keep animations optional and conservative. They should improve polish without changing business behavior or making tests timing-sensitive.
31. Use existing design tokens where possible, but identify hard-coded light-mode colors as a follow-up theme risk if the app remains light-only.
32. Keep the app compatible with Expo Go unless a chosen native UI dependency or versioned API proves otherwise. Custom native builds are not required for this PRD unless future implementation discovers a real Expo Go blocker.
33. Before implementation, verify current versioned Expo documentation for the SDK target in use and choose the syntax compatible with that target.
34. Do not co-locate reusable components, helpers, or utilities inside route definitions. Route files should become thinner and own navigation/data composition only.
35. Add project path aliases before broad refactors, then prefer aliases over fragile deep relative imports.
36. Rename reusable component files to kebab-case as they are touched, while avoiding route churn unless a route is intentionally restructured.
37. Keep visual acceptance anchored to the current beta screenshots and product docs. This is a native polish pass, not a new brand direction.

## Testing Decisions

1. Tests should assert external behavior and data contracts, not implementation details or private component state.
2. Existing source/UI assertion tests are good prior art for verifying visible copy, route affordances, and product behavior while allowing implementation changes.
3. Existing pure module tests are good prior art for testing navigation configuration and UI view-model helpers.
4. Add or update tests for accepted tab order, labels, hidden-route policy, default authenticated route, and Add entry behavior.
5. Add tests for the navigation shell/view-model module so future tab changes require intentional test updates.
6. Add tests for reusable UI primitives only where they encode behavior, accessibility labels, copyable/selectable data, disabled states, or platform-specific fallbacks. Do not snapshot-test every style.
7. Add tests for Feed row visible behavior: actor/verb/Venue copy, metadata, rating badge, media presence, like/comment/share/save affordances, and navigation destinations.
8. Add tests for Friends inbox visible behavior: empty state, request count, expanded request actions, conversation preview copy, hide affordance, and create-chat navigation.
9. Add tests for Conversation visible behavior: message bubble copy, attachment card labels, reply quote presence, reaction display, action menu availability, composer disabled states, and safe destructive action labels.
10. Add tests for Venue detail visible behavior: hero fallback, Website/Directions/Share actions, bookmark state, address copy, stats, tags, hours, popular posts, Rate CTA, and report flow presentation.
11. Add tests for Rating screen visible behavior: sentiment selection, photo picker affordance, companion chip selection, notes field, preview card, submit disabled state, and cancel behavior.
12. Add tests for Profile visible behavior: username/member-since copy, follower/following/rank status stats, edit/share actions, Your list empty/ranked states, and suggested users/search affordance.
13. Add tests for user profile social actions to ensure Follow and Friendship states remain separate.
14. Add tests for copyable/selectable text where important data is surfaced.
15. Add tests for tabular counter presentation only where the project already uses source assertions; avoid brittle pixel-level checks.
16. Keep Firestore rules and service tests unchanged unless UI hardening changes a write/read path. This PRD should not require new backend state tests.
17. Continue running the normal Jest suite, rules suite when touched behavior crosses Firestore, and Expo web export before handoff.
18. Manual QA should cover Expo Go first, then web export, then any custom build only if implementation selects dependencies or APIs unavailable in Expo Go.

## Out of Scope

- Changing Friends, Feed, Add, List, Profile product behavior beyond presentation and native action placement.
- Adding new chat attachment types, new planning tools, or new Friends social state.
- Reintroducing Leaderboard/Rank as a primary tab.
- Reworking Rating/Post canonical data ownership.
- Adding a backend feed projection worker or backend-owned chat send pipeline.
- Rewriting Firestore rules except where an unavoidable UI path change touches existing writes.
- Full dark-mode implementation unless explicitly selected as a separate theme slice.
- New Venue data providers, Places Photo API integration, booking, reservations, event recommendations, or crowd reports.
- Production accessibility audit at WCAG depth; this slice should improve accessibility basics but not claim exhaustive compliance.
- Pixel-perfect redesign of every screen.
- Native module authoring or custom native builds unless required by verified Expo SDK constraints.

## Further Notes

This PRD follows the current Rounds domain model: Friends is the hero planning surface; Feed is public/followed activity; Add creates Ratings; List is Venue discovery and Personal Ranking context; Profile shows public identity plus private Personal Ranking; Rating is the canonical opinion identity; Posts are public projections; Conversations contain DMs and group chats with planning attachments.

Recommended implementation order:

1. Navigation shell and native tabs.
2. Safe-area, header, keyboard, and scroll inset standardization.
3. UI primitive extraction for cards, rows, icon buttons, media thumbnails, empty states, and copyable text.
4. Icon/media/audio dependency alignment.
5. Chat action surface cleanup.
6. Modal/sheet cleanup for report-like flows.
7. Haptics and subtle state animations.
8. Final source/UI tests and Expo Go/web export verification.

Dirty-worktree note from the audit session: untracked agent/tooling files existed before this PRD was created. They are unrelated to this PRD.

## Comment — 2026-06-03T16:19:25Z
Implemented first native UI/navigation hardening pass: centralized navigation shell config, tab layout consumes config with keyboard-safe tab behavior, copyable text primitive for Venue/Profile data, safe-area screen container applied to touched screens, chat secondary message actions moved behind long-press action sheet, and Venue report UI moved into modal/sheet presentation. Verified with `npm test -- --runInBand` and `npx expo export --platform web --output-dir /tmp/rounds-web-export-native-ui`.
