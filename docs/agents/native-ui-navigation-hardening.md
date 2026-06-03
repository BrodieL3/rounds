# Native UI/navigation hardening

## Source issue

- `docs/issues/0001-native-ui-navigation-hardening.md`

## Scope for this implementation slice

Tracer bullet through the PRD's recommended first pass:

1. Centralize navigation shell config for Friends, Feed, Add, List, Profile.
2. Keep Add entry behavior as `/add` modal while primary tab order stays Friends-first.
3. Harden tab layout styling to rely less on manual tab height/padding.
4. Add reusable UI primitives where behavior exists: copyable text and safe screen container.
5. Move chat secondary message controls behind a long-press action surface.
6. Convert Venue miscategorization report from inline card to modal/sheet-like presentation.
7. Make important user-visible data copyable/selectable where touched.

## Done criteria

- Tests assert accepted tab order, labels, default auth route, Add entry href, hidden-route policy, and native icon metadata.
- Tab layout consumes the shell config rather than duplicating route metadata.
- Long-press message actions still expose Reply, React, Hide, Delete, and Report with destructive actions visually distinct in the action sheet.
- Venue address uses the copyable/selectable text primitive.
- Venue report UI uses a modal/sheet-like surface.
- Normal Jest suite passes.

## Sharp edges

- `expo-router/unstable-native-tabs` is alpha in current Expo docs and does not expose a custom center Add button equivalent to React Navigation `tabBarButton`. Keep JavaScript tabs for this pass so Add opens `/add` without selecting a blank route.
- Package target is Expo SDK 54 (`expo ~54.0.0`) despite global instruction mentioning SDK 56 docs; verify current docs plus installed router APIs before changing navigation.
- Keep business logic and Firestore shapes unchanged.

## Verification

- `npm test -- --runInBand`
- `npx expo export --platform web --output-dir /tmp/rounds-web-export-native-ui`
