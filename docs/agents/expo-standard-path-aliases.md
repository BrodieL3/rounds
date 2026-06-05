# Expo standard path aliases

## Source issue

- `docs/issues/0002-expo-standard-compliance-hardening.md`

## Scope

Second tracer slice for Expo standard compliance hardening:

1. Configure project path aliases before broad route/component refactors.
2. Prefer aliases for touched files only; do not mass-rewrite imports.
3. Keep Expo Router runtime and SDK target unchanged.
4. Add or update tests that prove aliases are discoverable by contributor tooling and Jest, and that at least one touched source import can use the alias.

## Done criteria

- Tests are added/updated before implementation and red is confirmed.
- Alias config exists for editor/tooling (`jsconfig.json` or equivalent), Metro/Babel runtime, and Jest tests.
- At least one low-risk touched import uses an alias instead of a deep relative path.
- Existing behavior and route names are unchanged.
- No product logic, Firestore/Storage/Functions contracts, navigation order, Rating/Post identity, Friends boundaries, or Cohort behavior changes.
- Verification includes exact commands:
  - targeted Jest command(s),
  - `npm test -- --runInBand`,
  - `npx expo-doctor`,
  - web export if runtime/Babel/Metro config changes.

## Sharp edges

- Current package target is Expo SDK 54; do not upgrade Expo SDK.
- Use version-compatible Expo/Metro/Babel alias docs or established Expo-compatible config.
- Avoid import-churn. This slice creates the seam; later route/view-model slices may migrate imports as touched.
- Dirty changes from completed dependency-doctor slice are intentional; do not revert them.
- If runtime alias setup would require custom native builds or destabilize Expo Go, document blocker and stop.

## Verification log

- Red: `npx jest lib/__tests__/path-alias-config.test.js --runInBand` — failed as expected before implementation: missing `jsconfig.json`, missing Jest mapper, missing Metro alias, touched route still used relative imports.
- Green targeted: `npx jest lib/__tests__/path-alias-config.test.js --runInBand` — PASS, 4 tests.
- Full Jest: `npm test -- --runInBand` — PASS, 69 passed / 2 skipped suites; 338 passed / 50 skipped tests.
- Expo doctor: `npx expo-doctor` — PASS, 18/18 checks.
- Web export: `npx expo export --platform web` — PASS, exported to `dist`.
