# Expo standard feed view-model extraction

## Source issue

- `docs/issues/0002-expo-standard-compliance-hardening.md`

## Scope

Eighth tracer slice (8A) for Expo standard compliance hardening:

1. Extract Feed route-local data composition into a testable pure view-model/service seam under `lib/**`.
2. Preserve public Post query/display behavior:
   - city-scoped posts,
   - followed-user promotion,
   - venue fallback lookup from seeded venues,
   - neighborhood fallback,
   - elapsed-time display input,
   - engagement flags and review share params remain unchanged.
3. Keep route file as composition layer for auth, Firestore subscription, navigation, and UI.

## Done criteria

- Tests are added/updated before implementation and red is confirmed.
- New Feed view-model/service tests cover city scoping assumption, followed-user promotion, venue fallback lookup, source labels, and sort order.
- `app/(tabs)/feed.js` no longer owns seed-venue map construction, fallback venue enrichment, followed/city source derivation, or sort comparator directly.
- Existing Feed visible copy, route destinations, engagement actions, media resolution, Rating badge, and Review share params are unchanged.
- Rating/Post identity remains ADR 005-compliant: route still reads public `posts` projections; no new Review model or Firestore shape.
- No Firestore/Storage/Functions contract changes.
- Verification includes exact commands:
  - targeted Jest command(s),
  - `npm test -- --runInBand`,
  - web export.

## Sharp edges

- Preserve followed-user promotion above other city posts.
- Keep city scoping at Firestore query edge and document pure helper assumptions.
- Keep media resolution behind existing `lib/media-display.js`.
- Do not move engagement mutations in this slice unless tests stay focused and behavior unchanged.
- Dirty changes from previous completed slices are intentional; do not revert them.

## Verification log

- Red: `npx jest lib/__tests__/feed-view-model.test.js --runInBand` -> failed as expected: `Cannot find module '../feed-view-model'`.
- Green targeted: `npx jest lib/__tests__/feed-view-model.test.js --runInBand` -> PASS, 1 suite / 3 tests.
- Full tests: `npm test -- --runInBand` -> PASS, 73 passed / 2 skipped suites; 355 passed / 50 skipped tests.
- Web export: `rm -rf /tmp/rounds-web-export-feed-view-model && npx expo export --platform web --output-dir /tmp/rounds-web-export-feed-view-model` -> PASS, exported to `/tmp/rounds-web-export-feed-view-model`.
