# Native UI safe-area/header cleanup

## Status

Completed slice under `docs/issues/0001-native-ui-navigation-hardening.md`.

## Scope

Standardize safe-area, native header, scroll inset, and keyboard-adjacent layout behavior on high-value route surfaces while preserving existing product behavior and route destinations.

Target surfaces:

- Feed
- Profile / User Profile
- Conversation
- Venue detail
- Rating / Add review

## Done criteria

- Route screens touched by this slice avoid fake top header padding/custom page-title duplication when native stack title or shared container should own it.
- Scrollable route roots use `ScrollView`, `FlatList`, or equivalent with automatic content inset behavior where compatible.
- Non-scrollable/composer-heavy routes explicitly account for safe area and keyboard without clipping primary actions.
- Existing visible behavior/copy/routes for Feed, Profile, Conversation, Venue, and Rating remain intact.
- Add or update targeted tests before implementation to assert stable visible behavior or source-level layout contracts for touched surfaces.
- Verification includes:
  - targeted red/green test command(s),
  - `npm test -- --runInBand`,
  - `npx expo export --platform web --output-dir /tmp/rounds-web-export-native-ui-safe-area`.

## Out of scope

- Product behavior changes.
- New Firestore/Storage/Functions APIs or document shapes.
- Full visual redesign, theme overhaul, or dark mode.
- Native tab/media/icon/audio work already completed or reserved for separate slices.
- Backend projection or rules hardening.

## Sharp edges

- Follow TDD. Add source/UI assertions first; confirm failing for expected reason.
- Read Expo SDK 56 docs before Expo code changes.
- Keep business logic out of route screens; reusable layout helpers belong under `components/**` or `lib/**`, not route files.
- Prefer `react-native-safe-area-context` over React Native `SafeAreaView`.
- Prefer native stack titles over custom title text where route ownership supports it.
- Preserve Friends-first navigation and canonical Rating/Post distinctions.
- Do not touch unrelated untracked `.agents/`, `.claude/`, or `skills-lock.json` unless explicitly instructed.

## Progress

- Feed/Profile tracer complete: automatic scroll/list content insets, fake top padding removed.
- Conversation tracer complete: safe-area-owned custom header, message list automatic content insets, manual header top padding removed.
- Conversation companion routes complete: create group, group info, share venue, and share review use automatic content insets and no `paddingTop: 54` fake header spacing.
- Venue/Rating tracer complete: automatic scroll/list content insets, rating fake title top margin removed.
- Expo SDK 56 docs access verified via exact agent tool call recorded in `RESOURCES.md`.

## Verification

- Red confirmed: `npm test -- lib/__tests__/native-ui-hardening-ui.test.js --runInBand` failed before implementation on missing automatic insets/safe-area wiring.
- Green targeted: `npm test -- lib/__tests__/native-ui-hardening-ui.test.js --runInBand` passed.
- Full Jest: `npm test -- --runInBand` passed (`332 passed`, `50 skipped`).
- Web export: `npx expo export --platform web --output-dir /tmp/rounds-web-export-native-ui-safe-area` passed.
