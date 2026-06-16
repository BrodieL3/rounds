# Maestro E2E — Rounds

End-to-end UI flows that drive the **real app on a device** against the Firebase
emulator. This is the verification surface jest can't reach: real navigation,
real Firebase Auth round-trips, real screen rendering.

## Flows

| Flow | What it proves |
|------|----------------|
| `auth-login.yaml` | Sign in with valid creds → lands on Friends |
| `auth-login-invalid.yaml` | Wrong password → inline error, stays on login |

## Prerequisites (the part jest doesn't need)

Maestro drives a **real device or emulator** — there is no headless mode. You need ONE of:

- **Android emulator** (Android Studio → AVD), or a physical Android device with USB debugging (`adb devices` shows it), **or**
- **iOS Simulator** (macOS only), or a physical iPhone.

> Note: the PAI Linux box has no Android emulator and no macOS, so these flows are
> authored there but **executed** on your dev machine / phone.

Because Rounds uses the Firebase **JS SDK** (not react-native-firebase), the app runs
in **Expo Go** — no custom native build required.

## Run it

```bash
# 1. Start the emulators
firebase emulators:start --only auth,firestore,functions,storage

# 2. Seed Firestore docs + the Auth user the login screen authenticates against
npm run e2e:seed
#   → alice@example.com / Test1234!  (uid test-alice)

# 3. Start the app pointed at the emulators (separate terminal)
EXPO_PUBLIC_USE_FIREBASE_EMULATORS=1 npm start
#   open it in Expo Go on your device/emulator

# 4. Run the flow (separate terminal)
npm run test:e2e:auth
#   or all flows:  maestro test .maestro/
```

## Selectors

Flows target stable `testID`s, never placeholder text:

| testID | Screen |
|--------|--------|
| `login-title`, `login-email-input`, `login-password-input`, `login-submit`, `login-error` | `app/login.js` |
| `friends-screen-title` | `app/(tabs)/friends.js` |

## Overrides

All creds/URLs are `env:` vars in each flow — override at the CLI:

```bash
maestro test .maestro/auth-login.yaml \
  -e EXPO_URL=exp://192.168.1.50:8081 \
  -e E2E_EMAIL=bob@example.com
```

- **iOS Expo Go:** change `appId` to `host.exp.Exponent`. Maestro `id:` matches RN
  `testID` on iOS too, but nested accessible wrappers can swallow taps; if that
  appears on a real iPhone/Simulator, fix component accessibility, not selectors.
- **Dev-client / standalone build:** set `appId` to the app's bundle id and replace the
  `openLink` step with a bare `- launchApp`.
- **Physical device:** set `EXPO_URL` to your machine's LAN dev-server URL.
