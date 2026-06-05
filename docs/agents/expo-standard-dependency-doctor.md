# Expo standard dependency doctor

## Source issue

- `docs/issues/0002-expo-standard-compliance-hardening.md`

## Scope

First tracer slice for Expo standard compliance hardening:

1. Align current installed Expo SDK dependencies so `npx expo-doctor` passes, without upgrading the Expo SDK major/minor target unless explicitly required by `npx expo install` for SDK 54.
2. Resolve current known doctor failures: missing `expo-font`, mismatched `@react-native-async-storage/async-storage`, and legacy/mismatched `expo-av` only to the extent needed for this dependency-doctor slice.
3. Remove or neutralize stale non-router app entry scaffolding (`App.js`, root `index.js`) so `expo-router/entry` remains the obvious runtime entry.
4. Add a small compliance verification script/wrapper if useful so future agents can run doctor consistently.
5. Preserve product behavior and do not start UI refactors, route thinning, native tabs, icon migration, or audio API migration beyond dependency alignment.

## Done criteria

- Tests are added/updated before implementation for behavior/source contracts this slice owns, especially real app entry clarity and dependency/compliance script wiring.
- Red is confirmed for at least one targeted test before implementation.
- `package.json` and lockfile use SDK-compatible package versions chosen with `npx expo install` or documented Expo SDK guidance.
- `npx expo-doctor` passes, or a blocker is documented in this file and implementation stops before requiring a custom build.
- Stale `App.js` / root `index.js` cannot mislead contributors into thinking the app runtime bypasses Expo Router.
- Existing behavior is preserved; no Firestore, Storage, Functions, Rating/Post, Friends, Cohort, or navigation contract changes.
- Verification includes exact commands:
  - targeted Jest command(s),
  - `npm test -- --runInBand`,
  - `npx expo-doctor`.

## Sharp edges

- Package target is currently Expo SDK 54 in `package.json` (`expo ~54.0.0`). Repo global instruction says read Expo SDK 56 docs before Expo code; do that, but do not upgrade Expo SDK as part of this slice without maintainer approval.
- Prefer `npx expo install <package>` over guessing Expo package versions.
- `expo-av` is still used by voice-note code. This slice may align/install/uninstall only if doctor requires it. Full migration to the current Expo audio API belongs to the later audio adapter slice.
- Keep Expo Go as default runtime. If a dependency choice requires custom native builds, document blocker and stop.
- Leave broad import alias, safe-area, navigation, icon, haptic, audio, and view-model work for later slices.
- Dirty setup docs from the orchestrator are intentional; do not revert them.

## Verification log

- Red: `npx jest lib/__tests__/expo-entry-compliance.test.js --runInBand` failed as expected before implementation: missing `doctor:expo` script and stale `App.js` scaffold text.
- Dependency alignment: `npx expo install expo-font @react-native-async-storage/async-storage expo-av` initially failed because stale dev dependency `@react-native/jest-preset@0.85.3` required React `^19.2.3`; removed unused preset, then reran same command successfully for SDK 54-compatible versions.
- Green targeted: `npx jest lib/__tests__/expo-entry-compliance.test.js --runInBand` passed (2 tests).
- Full Jest: `npm test -- --runInBand` passed (68 suites passed, 2 skipped; 334 tests passed, 50 skipped).
- Expo doctor: `npx expo-doctor` passed (`18/18 checks passed. No issues detected!`).
