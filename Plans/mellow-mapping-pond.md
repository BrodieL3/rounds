# Custom keyboard-height attachment panels

## Context

Today, tapping an attach option fires native UI: the photo picker (`expo-image-picker`), an `Alert`-driven location flow, and inline Composer branches for poll/voice that render at the bottom of the screen (the poll composer sits too low). We want every attachment to open a **custom panel that occupies the exact space the keyboard vacates**, for a cohesive in-app feel. Plus: polls should only exist in group chats, and the "location" option should become a venue picker that shares a venue into the chat (the app's real domain — `venue_link` messages already exist and render).

## Architecture — the keyboard-height panel host

Goal: when a panel is open, the Composer input row stays visible and a panel of height == last-measured keyboard height renders directly below it (where the keyboard was).

In `app/conversation/[id].js`:
- Measure keyboard height from `Keyboard` events (`e.endCoordinates.height`) in the existing keyboard listener; store `keyboardHeight` in state (default ~291 until first measured), persist last known.
- Add `activePanel` state: `null | 'photo' | 'poll' | 'voice' | 'venue'`.
- AttachmentMenu now reports a selection; on select → `setActivePanel(key)` + `Keyboard.dismiss()`. Re-focusing the text input (or sending) closes the panel (`setActivePanel(null)`).
- Render a new `<AttachmentPanel activePanel height={keyboardHeight} … />` **below** `<Composer>` inside the `KeyboardAvoidingView`. When `activePanel` is null it renders nothing; otherwise a fixed-height (`height`) container. Because the panel height equals the keyboard height and the keyboard is dismissed when a panel opens, the composer stays put and the panels all occupy identical space (the shared-size requirement).

## Components

**NEW `components/conversation/panels/AttachmentPanel.js`** — host. Fixed-height (`height` prop) container, `backgroundColor: COLORS.bg`; `switch(activePanel)` → renders `PhotoPanel | PollPanel | VoicePanel | VenuePanel`. Forwards the props each needs.

**NEW `PhotoPanel.js`** — uses `expo-media-library` (`getAssetsAsync`) to show a scrollable grid (`FlatList numColumns`) of recent photos with multi-select (selected = lime ring + check); a leading Camera tile launches `expo-image-picker` camera. "Send (n)" calls `onSendPhotos(photos)`. Requests `requestPermissionsAsync()`; if denied, show a permission prompt + Settings link. Reuses the photo payload shape from `useConversationSurface.sendPhotos` (`{ uri, aspectRatio }`).

**NEW `PollPanel.js`** — moves the poll composer out of `Composer.js` into a properly-sized, scrollable panel (question input, options list, "+ Add option", allow-multiple toggle, Send poll). Reuses existing hook state: `pollQuestion/setPollQuestion`, `pollOptions/setPollOptions`, `pollAllowMultiple/setPollAllowMultiple`, `sendPoll`, `sendingPoll`. Only ever shown in group chats (see gating).

**NEW `VoicePanel.js`** — a single large mic button, **press-and-hold to record** (`onPressIn` → `startRecording`, `onPressOut` → `stopRecordingAndSend`). A red `Animated` circle scales from behind the icon (0→1) over the hold, capped at the existing 60s max (mirrors `voiceRecordElapsed`/auto-stop in the hook). Shows elapsed time. Replaces the current `voiceRecording` branch in `Composer.js`. Uses core `Animated` (matches `PlusMorphIcon`/`AttachmentMenu`; no reanimated dep).

**NEW `VenuePanel.js`** — venue picker that sends a `venue_link`.
- Loads the viewer's comparisons: `getDocs(query(collection(db,'comparisons'), where('userId','==',user.uid)))` (pattern from `app/(tabs)/list.js:79-86`).
- City via `profile?.city || 'nyc'` (from `useAuth`); venues = `VENUE_DATA.cities[cityKey].venues` (`assets/venues.json`).
- Ranked list via `buildStackRankings(cityVenues, comparisons)` (exported from `lib/personal-rankings.js`) → ranked venues first (the user's #1 at top), rest in catalog order. A search bar (`TextInput`) filters the full list by name. Rows reuse `getVenueVisualFallback` + `COHORT_LABELS` like `share-venue.js`.
- Tapping a venue → `onSendVenue({ venue, cityKey })` → closes panel.

## Modified files

- **`components/conversation/AttachmentMenu.js`** — replace per-action props (`onPhoto/onVoice/onPoll/onLocation`) with a single `onSelect(key)` + `isGroup` prop. Option list: Photo, Voice, Venue always; **Poll only when `isGroup`** (filter `OPTIONS`). "Location" option becomes the venue picker (keep map-pin icon, label "Venue"). Keep the paperclip↔X morph + spring-up animation already built.
- **`components/conversation/Composer.js`** — remove the `pollComposerOpen` and `voiceRecording` early-return branches (they move to panels). Keep the input row, the circular send button, `bottomInset` docking, and `AttachmentMenu` (now wired to `onSelectAttachment`). Drop now-unused poll/voice props.
- **`app/conversation/[id].js`** — keyboard-height capture + `activePanel`; render `AttachmentPanel`; wire `onSelectAttachment`; add `sendVenueLink` from the hook; pass panel props (photo/poll/voice/venue handlers + state).
- **`hooks/useConversationSurface.js`** — add `sendVenueLink({ venue, cityKey })` wrapping `sendDirectVenueLinkMessage`/`sendGroupVenueLinkMessage` (`lib/friends/venue-link-service.js`), mirroring the existing `sendLocation` guard/branch pattern. Keep poll guard (`isGroup`) as defense-in-depth.
- **`app.json`** — register `expo-media-library` plugin with `photosPermission` string.

## Dependency

`bunx expo install expo-media-library` (Expo-managed; included in Expo Go, so no custom dev client needed).

## Group-only polls

Two layers: AttachmentMenu hides the Poll option when `!isGroup`; `useConversationSurface.sendPoll` already early-returns unless `isGroup && conversation` — keep that guard.

## Tests (repo convention: source-assertion `lib/__tests__/*-ui.test.js` + babel transform)

- Update `friends-poll-ui`, `friends-photo-ui`, `friends-voice-ui`, `friends-location-ui`, `conversation-surface-ui` for the new panel structure (poll moved to `PollPanel`, photo grid panel, voice press-and-hold panel, location→venue panel).
- Add assertions: AttachmentMenu gates Poll on `isGroup`; `AttachmentPanel` switches on `activePanel` with a fixed `height`; VoicePanel uses `onPressIn`/`onPressOut`; VenuePanel uses `buildStackRankings` + search.
- Run `npx jest lib/__tests__/friends-*-ui.test.js lib/__tests__/conversation-surface-ui.test.js` and babel-transform changed files via the project's `babel-preset-expo` (per the rounds web-verification convention — no live browser).

## Verification

1. `bunx expo install expo-media-library`; typecheck/transform clean.
2. Jest suites above green.
3. Manual on device/sim (I can't render here): open a thread as `@brodiet` → tap attach → each option opens a panel the **same height as the keyboard**; photo grid multi-select + send; poll only appears in the **Thursday Crew** group, not DMs, and sits properly (not too low); voice mic fills red on hold and sends on release; venue list starts at your #1 with working search and sends a venue card.

## Out of scope / notes

- Geolocation `sendLocation` stays in the hook/codebase (the `location` message type still renders); it's just no longer wired to the attach menu.
- iMessage-style "expand panel to full screen" gesture is not included.
