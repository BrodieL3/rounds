# Expo standard audio adapter

## Source issue

- `docs/issues/0002-expo-standard-compliance-hardening.md`

## Scope

Seventh tracer slice for Expo standard compliance hardening:

1. Replace direct `expo-av` voice-note recording/playback usage with a deep audio adapter that exposes simple recording and playback operations.
2. Prefer the current Expo audio API for the installed SDK target; install SDK-compatible package(s) with `npx expo install` if required.
3. Keep Conversation voice-note behavior intact:
   - start/stop recording,
   - duration reporting,
   - max duration timer,
   - upload existing `audio/m4a` payloads,
   - playback start/pause,
   - expired/temp labels.
4. Keep Expo Go as default. Stop and document blocker if current Expo audio API cannot run in Expo Go.

## Done criteria

- Tests are added/updated before implementation and red is confirmed.
- Audio adapter tests use mocked Expo audio APIs for recording start/stop, playback start/pause, duration reporting, cleanup, and error/no-op behavior.
- `lib/friends/voice-recorder.js` no longer imports `expo-av` directly; it uses the adapter.
- `components/VoiceBubble.js` no longer imports `expo-av` directly; it uses the adapter.
- Existing voice service payload/storage contracts stay unchanged (`m4a`, storage path, duration, expiration).
- `npx expo-doctor` passes after package changes, or blocker is documented and implementation stops.
- No Firestore/Storage/Functions contract changes.
- Verification includes exact commands:
  - targeted Jest command(s),
  - `npm test -- --runInBand`,
  - `npx expo-doctor`,
  - web export.

## Sharp edges

- Do not change voice message document shape, Storage path, or `audio/m4a` upload behavior.
- Do not implement sender-save or one-time post-play disappearance; those are separate voice lifecycle fast-follows.
- Keep fallback/error handling conservative so Conversation UI does not crash if audio setup fails.
- Dirty changes from previous completed slices are intentional; do not revert them.

## Verification log

- Red: `npx jest lib/__tests__/audio-adapter.test.js lib/__tests__/friends-voice-ui.test.js --runInBand` -> failed as expected before implementation (`Cannot find module 'expo-audio'`; `VoiceBubble` still used `expo-av` / `Audio.Sound.createAsync`).
- Package install: `npx expo install expo-audio` -> added SDK 54-compatible `expo-audio`; `npm uninstall expo-av` -> removed legacy audio package.
- Peer install: first `npx expo-doctor` -> failed 17/18, missing `expo-asset` required by `expo-audio`; `npx expo install expo-asset` -> installed SDK 54-compatible peer/config plugin.
- Green targeted: `npx jest lib/__tests__/audio-adapter.test.js lib/__tests__/friends-voice-ui.test.js --runInBand` -> PASS, 2 suites / 8 tests.
- Orchestrator correction red: `npx jest lib/__tests__/audio-adapter.test.js --runInBand` -> failed on invalid iOS recording constants (`mpeg4aac` / `medium`) and missing playback finish listener.
- Orchestrator correction green: `npx jest lib/__tests__/audio-adapter.test.js lib/__tests__/friends-voice-ui.test.js --runInBand` -> PASS, 2 suites / 8 tests after using `ExpoAudio.IOSOutputFormat.MPEG4AAC`, `ExpoAudio.AudioQuality.MEDIUM`, seconds-to-ms fallback, and `playbackStatusUpdate` cleanup.
- Full Jest: `npm test -- --runInBand` -> PASS, 71 passed / 2 skipped suites, 350 passed / 50 skipped tests.
- Expo doctor: `npx expo-doctor` -> PASS, 18/18 checks.
- Web export: `rm -rf /tmp/rounds-web-export-audio-adapter && npx expo export --platform web --output-dir /tmp/rounds-web-export-audio-adapter` -> PASS, exported to `/tmp/rounds-web-export-audio-adapter`.
