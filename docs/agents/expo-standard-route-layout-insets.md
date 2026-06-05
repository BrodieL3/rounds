# Expo standard route layout insets

## Source issue

- `docs/issues/0002-expo-standard-compliance-hardening.md`

## Scope

Third tracer slice for Expo standard compliance hardening:

1. Finish automatic content inset adoption on remaining scroll/list routes named by the PRD audit:
   - Friends tab
   - List tab
   - Add route / Add tab placeholder if scrollable
   - Edit Profile
   - onboarding city / preferences / Spotify and any onboarding scroll/list pages still missing insets
   - Post detail
   - Search
   - User Profile
2. Remove fake header spacing/manual top padding where native headers, automatic content insets, safe-area containers, or keyboard-aware roots should own spacing.
3. Preserve existing visible behavior, route destinations, copy, params, and product flows.
4. Add or update source/UI tests for route layout contracts rather than pixel-perfect styles.

## Done criteria

- Tests are added/updated before implementation and red is confirmed.
- Each targeted scroll/list route either uses `contentInsetAdjustmentBehavior="automatic"` on the scroll/list root or has a documented composer/non-scroll exception in this file.
- Keyboard-heavy routes continue to avoid clipping inputs/actions through existing keyboard/safe-area patterns.
- Fake header padding such as `paddingTop: 54`, `marginTop: 48`, or similar route-title spacing is removed from targeted routes unless documented as product content.
- Existing Friends-first navigation, Add entry, Feed/List/Profile roles, Rating/Post identity, Friend/Follower separation, and Cohort behavior are unchanged.
- No Firestore/Storage/Functions contract changes.
- Verification includes exact commands:
  - targeted Jest command(s),
  - `npm test -- --runInBand`,
  - web export.

## Sharp edges

- Prefer native/content-inset ownership over adding more manual safe-area padding.
- Do not convert global headers or native titles in this slice; navigation/header/title contract is the next slice.
- Keep route files as composition layers where touched, but do not start broad view-model extraction yet.
- Path alias config exists; use aliases only for touched imports where low-risk.
- Dirty changes from previous completed slices are intentional; do not revert them.

## Verification log

- `npx jest lib/__tests__/native-ui-hardening-ui.test.js --runInBand` — RED before implementation: new remaining-audited-routes source contract failed on missing `contentInsetAdjustmentBehavior="automatic"` in `app/(tabs)/friends.js`.
- `npx jest lib/__tests__/native-ui-hardening-ui.test.js --runInBand` — PASS after implementation: 9 tests passed.
- `npm test -- --runInBand` — PASS: 69 passed, 2 skipped test suites; 339 passed, 50 skipped tests.
- `rm -rf /tmp/rounds-web-export-route-layout-insets && npx expo export --platform web --output-dir /tmp/rounds-web-export-route-layout-insets` — PASS; exported to `/tmp/rounds-web-export-route-layout-insets`.

Route exceptions:

- `app/(tabs)/add-tab-placeholder.js` is non-scroll placeholder only; no inset prop needed.
