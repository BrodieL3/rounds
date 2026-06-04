# Expo Resources

## Knowledge

- [Expo SDK 56 docs](https://docs.expo.dev/versions/v56.0.0/)
  Version-specific API reference requested by project instructions. Use for: exact package APIs and compatibility. Agent harness note: `functions.bash({"command":"cd /home/brodie/Code/Rounds && curl -L -A 'Mozilla/5.0' -sS https://docs.expo.dev/versions/v56.0.0/ | head -40","timeout":30})` succeeds; plain Python `urllib.request.urlopen` returns HTTP 403.
- [Expo workflow overview](https://docs.expo.dev/workflow/overview/)
  Explains Expo development workflow and how projects move from local development to builds. Use for: mental model.
- [Development builds](https://docs.expo.dev/develop/development-builds/introduction/)
  Explains custom dev clients beyond Expo Go. Use for: Spotify auth/native SDKs, custom native modules, production-like testing.
- [Expo Router](https://docs.expo.dev/router/introduction/)
  File-based routing for Expo apps. Use for: Rounds screens, tabs, modal flows, deep links.
- [EAS](https://docs.expo.dev/eas/)
  Expo Application Services for builds, updates, submit, credentials. Use for: real device builds and release pipeline.
- [Using Firebase with Expo](https://docs.expo.dev/guides/using-firebase/)
  Official Expo guidance for Firebase JS SDK and React Native Firebase tradeoffs. Use for: auth/data if Firebase is chosen.
- [React Native docs](https://reactnative.dev/docs/getting-started)
  Core platform primitives underneath Expo. Use for: components, styling, platform behavior.

## Wisdom (Communities)

- [Expo Discord](https://chat.expo.dev/)
  Official community. Use for: SDK-specific issues, build errors, native module compatibility.
- [Expo GitHub Discussions](https://github.com/expo/expo/discussions)
  Public discussions from maintainers and users. Use for: architectural questions and known limitations.

## Gaps

- Need choose backend resource set later: Supabase/Firebase/custom API, once auth/data needs are clearer.
- Need choose maps/location/geofencing resource set later, before crowd reporting prototype.
