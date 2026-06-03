# Native UI media adapter

## Source issue

- `docs/issues/0001-native-ui-navigation-hardening.md`

## Scope for this implementation slice

Tracer bullet for PRD media migration:

1. Add small reusable media image primitive backed by `expo-image`.
2. Keep media rendering API stable for screens: URI in, native image component out.
3. Migrate high-value surfaces first: Feed avatars/review media and Conversation photo bubbles.
4. Preserve existing Feed behavior, routes, engagement actions, chat photo behavior, and media path resolution.
5. Leave broader Profile, Venue, Rating, Post, and onboarding migration as follow-up.

## Done criteria

- `expo-image` is installed with Expo SDK-compatible version.
- Tests assert Feed uses the shared media primitive instead of importing React Native `Image`.
- Tests assert Conversation photo bubbles use the shared media primitive for single and grid photos.
- Tests assert the media primitive wraps Expo Image and normalizes URI/string source input.
- Feed avatars/review media and Conversation photo bubbles still render from existing URI values.
- Normal Jest suite passes.
- Expo web export passes before handoff.

## Sharp edges

- Package target is Expo SDK 54 (`expo ~54.0.0`); use `npx expo install expo-image` instead of guessing versions.
- Do not persist download URLs or change media document/storage contracts; ADR 005 keeps Rating media paths canonical.
- Keep Firebase/media resolution behind existing service seams (`lib/media-display.js`).
- Do not migrate all image call sites in one broad sweep; use tracer bullets.

## Verification

- `npm test -- --runInBand`
- `npx expo export --platform web --output-dir /tmp/rounds-web-export-native-ui-media-conversation`
