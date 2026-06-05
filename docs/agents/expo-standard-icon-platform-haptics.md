# Expo standard icon platform haptics

## Source issue

- `docs/issues/0002-expo-standard-compliance-hardening.md`

## Scope

Sixth tracer slice for Expo standard compliance hardening:

1. Add a semantic icon adapter that maps product actions/surfaces to platform-preferred symbol names and cross-platform fallbacks.
2. Update the existing `AppIcon` primitive to consume the adapter while preserving current rendered fallback behavior.
3. Add a platform service for platform booleans and guarded haptic helpers.
4. Add Expo-compatible haptics dependency only if needed, using `npx expo install`.
5. Replace a small low-risk touched haptic/action path if safe; broad haptics migration remains staged.

## Done criteria

- Tests are added/updated before implementation and red is confirmed.
- Icon adapter tests prove semantic actions resolve to native/SF symbol names plus fallbacks without route components knowing icon libraries.
- Platform service tests prove iOS haptic calls are guarded and non-iOS/web no-op safely.
- `AppIcon` can still render current fallback icon names, and can render semantic icon keys through the adapter.
- Existing tab icons/labels, Add entry behavior, visible controls, and product flows are unchanged.
- `npx expo-doctor` passes after any package changes.
- No broad direct-Ionicons migration, visual redesign, route rewrites, or domain/backend contract changes.
- Verification includes exact commands:
  - targeted Jest command(s),
  - `npm test -- --runInBand`,
  - `npx expo-doctor` if dependencies changed,
  - web export.

## Sharp edges

- Keep `@expo/vector-icons` fallback available until screen-by-screen migration is done.
- Do not introduce missing icons on Android/web; fallback must be centralized.
- Haptics must be safe no-op outside iOS and when dependency is unavailable/mocked.
- Do not require custom native builds; Expo Go remains default.
- Dirty changes from previous completed slices are intentional; do not revert them.

## Verification log

- Docs: attempted Expo SDK 54 haptics/icons docs via `https://docs.expo.dev/versions/v54.0.0/sdk/haptics/` and `https://docs.expo.dev/guides/icons/`; request returned HTTP 403 in harness, so implementation stayed within Expo SDK 54 package target and used `npx expo install`.
- Red: `npx jest lib/__tests__/icon-platform-haptics.test.js --runInBand` → failed expected, missing `../icon-platform`.
- Green targeted: `npx jest lib/__tests__/icon-platform-haptics.test.js lib/__tests__/navigation-shell.test.js --runInBand` → PASS, 2 suites / 10 tests.
- Final targeted: `npx jest lib/__tests__/icon-platform-haptics.test.js --runInBand` → PASS, 1 suite / 5 tests.
- Full Jest: `npm test -- --runInBand` → PASS, 70 passed / 72 total suites, 346 passed / 396 total tests, 2 suites and 50 tests skipped.
- Dependency install: `npx expo install expo-haptics` → installed SDK 54-compatible `expo-haptics`.
- Expo doctor: `npx expo-doctor` → PASS, 18/18 checks.
- Web export: `rm -rf /tmp/rounds-web-export-icon-platform-haptics && npx expo export --platform web --output-dir /tmp/rounds-web-export-icon-platform-haptics` → exported successfully to `/tmp/rounds-web-export-icon-platform-haptics`.
