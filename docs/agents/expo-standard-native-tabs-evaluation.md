# Expo standard native tabs evaluation

## Source issue

- `docs/issues/0002-expo-standard-compliance-hardening.md`

## Scope

Fifth tracer slice for Expo standard compliance hardening:

1. Evaluate whether version-compatible Expo Router native tabs can preserve the accepted tab model:
   - Friends, Feed, Add, List, Profile,
   - Friends default authenticated destination,
   - center Add opens `/add` modal quickly,
   - no blank primary Add route selected.
2. If native tabs can preserve behavior safely in Expo Go, migrate conservatively.
3. If native tabs cannot preserve Add-as-modal behavior without a blank primary route or product regression, keep JavaScript tabs and document/test the exception.
4. Keep tab icon/label semantics sourced from the navigation shell.

## Done criteria

- Tests are added/updated before implementation and red is confirmed.
- Native tabs decision is represented in tested navigation metadata or source contract.
- Existing tab order, labels, Add entry route, hidden Leaderboard policy, and default authenticated route are unchanged.
- If JavaScript tabs remain, exception explains the exact Add-behavior blocker and future re-evaluation condition.
- No visual redesign, route rewrites, or domain/backend contract changes.
- Verification includes exact commands:
  - targeted Jest command(s),
  - `npm test -- --runInBand`,
  - web export.

## Sharp edges

- ADR 003 controls Friends-first navigation.
- Do not accept a blank Add tab route as primary UX regression.
- Do not require custom native builds; Expo Go remains default.
- Preserve route file names unless migration requires it and tests prove parity.
- Dirty changes from previous completed slices are intentional; do not revert them.

## Verification log

- Read Expo Router native tabs docs/API for SDK 54/Router 6 via `node_modules/expo-router/unstable-native-tabs.d.ts` and Expo docs page `https://docs.expo.dev/versions/v54.0.0/sdk/router-native-tabs/` after SDK 56 versioned native-tabs route returned 404. Package target remains Expo SDK 54 (`expo ~54.0.0`, `expo-router ~6.0.23`).
- Decision: keep JavaScript tabs. Expo Router unstable native tabs model primary entries as selectable route triggers (`NativeTabs.Trigger name=...`) with hidden support, but no equivalent to current JS `tabBarButton` center Add button that pushes `/add` modal without selecting the placeholder route. Migrating now would require accepting/selecting `add-tab-placeholder` or redesigning product flow.
- Future re-evaluation: native tabs can replace JS tabs when Expo Go-compatible native tabs support a custom non-selecting tab bar action/modal trigger or equivalent custom tab button parity.
- Red: `npx jest lib/__tests__/navigation-shell.test.js --runInBand` failed as expected with `TypeError: getTabImplementationDecision is not a function`.
- Green targeted: `npx jest lib/__tests__/navigation-shell.test.js --runInBand` passed (`6 passed`).
- Full test: `npm test -- --runInBand` passed (`69 passed, 2 skipped`, `341 passed, 50 skipped`).
- Web export: `rm -rf /tmp/rounds-web-export-native-tabs-evaluation && npx expo export --platform web --output-dir /tmp/rounds-web-export-native-tabs-evaluation` passed; exported to `/tmp/rounds-web-export-native-tabs-evaluation`.
