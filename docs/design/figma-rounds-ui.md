# Rounds Figma UI extraction

Source: Figma `Rounds`, file key `8CcbpAdt4AMYS9hulRy15n`, page node `0:1`.

## Shared frame

- Device frame: `402 x 874`.
- Background: `#F0F0F0`.
- Hero/accent: `#084EB8`.
- Text: `#111827`.
- Placeholder gray: `#D9D9D9`.
- Secondary grays: `#A0A0A0`, `#B9B9B9`.
- Title baseline: `y = 68`, `20px`.
- Bottom nav icons: `30 x 30`, `y = 810`, x positions `[34, 110, 186, 262, 338]`.

## Frames

| Frame | Node | Notes |
|---|---:|---|
| Friends | `4:380` | Title at `(26,68)`, compose icon `(346,68)`, icon-only nav selected Friends. Placeholder rows use existing conversation/request data, then gray avatar fallbacks. |
| Plus Menu | `10:1773` | Sheet starts `y=437`, size `402x437`, radius `30`. Handle `(141,450)`, `120x4`. Three hero-blue `76x76` tiles. |
| Discover | `7:48` | Title at `(25,68)`, search icon `(351,68)`. User-facing copy says Discover; interim data can reuse `posts`/feed view-model. |
| List | `12:227` | User-facing title `My List` at `(26,68)`, filter icon `(352,68)`. Back with saved/rated venues/ranking data. |
| Profile | `7:65` | Center avatar `84x84` at `(159,73)`, share at `(306,68)`, dots at `(352,68)`, name and username placeholders. |
| Chat | `9:419` | Back icon `(15,76)`, avatar stack `(170,59)`, title `Group Chat` at `(158,122)`, composer `(98,489,253x39)`, keyboard starts `y=532`. |

## Plus Menu actions

1. Create group chat → `/conversation/new`.
2. Rate a venue → `/add`.
3. Create a post → `/post/new`.

## Placeholder plan

- Friends: friends conversations/request summaries; gray avatar/conversation placeholders when empty.
- Discover: public `posts` projection/feed view-model until Discover spec deepens.
- My List: saved/rated venues and personal ranking data where present; empty gray rows otherwise.
- Profile: current profile stats/ranked venues where present; do not expose Friendship as public follower count.
- Chat: native keyboard for typing; extension trays replace keyboard-height area.

## Implementation notes

- SDK stays 54 and Expo Go remains sanity path.
- Keep JS tabs for now because center Plus uses a tab-press interceptor to open a route-backed form sheet without selecting the placeholder tab.
- Plus Menu uses `presentation: 'formSheet'` for native drag-to-close behavior and animation; Apple sheet grabber supplies the only top bar.
- Root form sheets are native modal layers above the tab navigator, so they cannot render behind the bottom nav icons in this stack. The Plus route sets `contentStyle.backgroundColor` to `#D9D9D9` so native sheet safe-area chrome matches the sheet instead of showing a white bottom bar.
