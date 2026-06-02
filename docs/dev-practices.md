# Development Practices

## Status
Current repo development-practice note. Use alongside global TDD instructions and `CONTEXT-MAP.md` startup order.

## Dev Server Management

The Expo dev server may already be running on `localhost:8081`. Do **not** run `npx expo start` again — it will conflict. For debugging, read Metro console output from the existing server or use `curl` against it. Build commands (`expo export`, `expo-doctor`) are fine for verification but should not replace live debugging from the running server.

## Firebase emulator UI QA

Use client emulator wiring only for local manual QA. Set `EXPO_PUBLIC_USE_FIREBASE_EMULATORS=1` and, when testing from a device, set `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST` to the host machine LAN IP. Optional port overrides mirror the Firebase services: `EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_PORT`, `EXPO_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_PORT`, `EXPO_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_PORT`, and `EXPO_PUBLIC_FIREBASE_STORAGE_EMULATOR_PORT`.

Install Functions dependencies once, then start emulators with Auth, Firestore, Functions, and Storage before restarting Expo so the Firebase SDK connects to emulators before first use:

```bash
npm --prefix functions install
firebase emulators:start --project rounds-8d89f --only auth,firestore,functions,storage
```

Emulator ports are declared in `firebase.json` and mirror `.env.example` defaults.
