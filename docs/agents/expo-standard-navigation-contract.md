# Expo standard navigation contract

## Source issue

- `docs/issues/0002-expo-standard-compliance-hardening.md`

## Scope

Fourth tracer slice for Expo standard compliance hardening:

1. Extend the navigation shell module so route metadata is centralized and testable beyond primary tabs:
   - native title metadata,
   - route roles,
   - modal/sheet presentation intent,
   - hidden-route policy,
   - search/header capability,
   - default authenticated destination.
2. Make stack layout files consume the centralized metadata for low-risk screen options.
3. Prefer native stack titles where route ownership supports it, while preserving current product copy and avoiding broad visual redesign.
4. Keep custom page-title text only where it remains product content or is documented as a custom-header exception.
5. Preserve JavaScript tabs for now; native tab migration/evaluation is the next slice.

## Done criteria

- Tests are added/updated before implementation and red is confirmed.
- `lib/navigation-shell.js` exposes tested route metadata for root, onboarding, tab, modal/sheet, search, and hidden routes.
- `app/_layout.js` and `app/onboarding/_layout.js` consume centralized stack metadata instead of duplicating route screen options inline where practical.
- Existing Friends-first tab order, Add modal entry behavior, hidden Leaderboard policy, route names, and visible flows are unchanged.
- Any remaining custom-header/page-title exceptions are documented in this file or in tested metadata.
- No Firestore/Storage/Functions/domain contract changes.
- Verification includes exact commands:
  - targeted Jest command(s),
  - `npm test -- --runInBand`,
  - web export.

## Sharp edges

- Do not migrate to native tabs in this slice. Keep Add-as-modal behavior unchanged.
- Avoid global header flips that would duplicate existing custom headers or break spacing; use metadata conservatively.
- Read ADR 003 before tab/navigation edits.
- Respect ADR 005 if touching post/rating routes: Review links and canonical IDs remain unchanged.
- Path aliases exist; use them only for touched imports where low-risk.
- Dirty changes from previous completed slices are intentional; do not revert them.

## Verification log

- Red: `npx jest lib/__tests__/navigation-shell.test.js --runInBand` → failed as expected with `TypeError: getRootStackScreens is not a function`.
- Green targeted: `npx jest lib/__tests__/navigation-shell.test.js --runInBand` → PASS, 5 tests.
- Full Jest first pass: `npm test -- --runInBand` → failed only legacy source-string test `profile-redesign-ui.test.js` expecting inline `edit-profile` modal registration in `app/_layout.js`.
- Full Jest final: `npm test -- --runInBand` → PASS, 69 suites passed, 2 skipped; 340 tests passed, 50 skipped.
- Web export: `rm -rf /tmp/rounds-web-export-navigation-contract && npx expo export -p web --output-dir /tmp/rounds-web-export-navigation-contract` → PASS; exported to `/tmp/rounds-web-export-navigation-contract`.

Custom-header exceptions kept documented/tested in route metadata: `add`, `edit-profile`, `venue`, `search`, `post`, `user`. Native headers remain hidden to avoid duplicate/broken custom route headers; stack layouts consume centralized title/presentation metadata only.
