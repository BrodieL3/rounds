# Maestro E2E — Rounds

End-to-end UI flows that drive the **real app on a device** against the Firebase
emulator. This is the verification surface jest can't reach: real navigation,
real Firebase Auth round-trips, real screen rendering.

## Flows

| Flow | What it proves |
|------|----------------|
| `auth-login.yaml` | Sign in with valid creds → lands on Friends (legacy Expo Go harness) |
| `auth-login-invalid.yaml` | Wrong password → inline error, stays on login (legacy Expo Go harness) |
| `devclient-auth-login.yaml` | Same happy-path sign-in, adapted for the EAS dev client — current proven harness other flows copy their preamble from |
| `compare.yaml` | Pairwise comparison + Personal Ranking screen (`app/compare.js`), dev client |
| `friends-surface.yaml` | Friends + DMs/conversations surface, dev client |
| `signup-onboarding.yaml` | New-user signup + onboarding, dev client |
| `venue-rate.yaml` | Browse a venue → Log a visit → Rating creation, dev client |

> **`config.yaml` gap:** its flow glob is `"auth-*.yaml"`, which only matches the two legacy `auth-*` files — `maestro test .maestro/` does **not** currently run `devclient-auth-login`, `compare`, `friends-surface`, `signup-onboarding`, or `venue-rate`. Each must be invoked by filename until the glob is updated; not fixed here since it changes test-run behavior, not just docs.

## Prerequisites (the part jest doesn't need)

Maestro drives a **real device or emulator** — there is no headless mode. You need ONE of:

- **Android emulator** (Android Studio → AVD), or a physical Android device with USB debugging (`adb devices` shows it), **or**
- **iOS Simulator** (macOS only), or a physical iPhone.

> Note: the PAI Linux box has no Android emulator and no macOS, so these flows are
> authored there but **executed** on your dev machine / phone.

The dev machine runs the app on the **EAS `ios-simulator` dev client** (`com.eidorbeel.rounds`, `eas.json`), **not Expo Go** — native modules (maps, camera) require it. The two legacy `auth-*.yaml` flows still target Expo Go's bundle id (`host.exp.Exponent`); every other flow targets the dev client.

## Run it (dev client — current path)

```bash
# 1. Start the emulators
firebase emulators:start --only auth,firestore,functions,storage

# 2. Seed Firestore docs + the Auth user the login screen authenticates against
node scripts/e2e-auth-seed.js && node scripts/friends-seed.js
#   → alice@example.com / Test1234!  (uid test-alice)

# 3. Start Metro pointed at the emulators, on the port the dev-client flows expect
EXPO_PUBLIC_USE_FIREBASE_EMULATORS=1 npx expo start --dev-client --port 8082

# 4. iOS Simulator booted with the dev client installed, then run a flow by filename
maestro test .maestro/devclient-auth-login.yaml
```

## Selectors

Flows target stable `testID`s, never placeholder text:

| testID | Screen |
|--------|--------|
| `login-title`, `login-email-input`, `login-password-input`, `login-submit`, `login-error` | `app/login.js` |
| `friends-screen-title` | `app/(tabs)/friends.js` |

> Table only covers the legacy auth flows; the newer dev-client flows (`compare`, `friends-surface`, `signup-onboarding`, `venue-rate`) target additional screens not yet listed here.

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
