# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into Rounds. The SDK (`posthog-react-native`) was installed and configured via `src/config/posthog.js` and `app.config.js` (which exposes token/host via `Constants.expoConfig.extra`). The root layout (`app/_layout.js`) was wrapped with `PostHogProvider` with autocapture enabled and manual screen tracking wired to Expo Router's `usePathname`. User identity is established on sign-in, sign-up, and session restore in `contexts/AuthContext.js`. Twelve custom events were instrumented across nine files covering the full user journey: acquisition, onboarding, venue engagement, core rating conversion, ranking loop, social features, and feed engagement.

| Event | Description | File |
|---|---|---|
| `user_signed_up` | New account created via signup screen | `app/signup.js` (via AuthContext) |
| `onboarding_completed` | User finishes profile setup (DOB, display name, username) | `app/onboarding.js` |
| `user_signed_in` | Returning user signs in with email and password | `app/login.js` (via AuthContext) |
| `venue_viewed` | User opens a venue detail page — top of log-a-visit funnel | `app/venue/[id]/index.js` |
| `venue_bookmarked` | User saves or un-saves a venue | `app/venue/[id]/index.js` |
| `visit_logged` | User successfully submits a rating — core product conversion | `app/venue/[id]/rate.js` |
| `comparison_submitted` | User picks a winner in the head-to-head venue comparison | `app/compare.js` |
| `ranking_completed` | User finishes all pair comparisons in a cohort | `app/compare.js` |
| `rank_unlocked` | User reaches the 5-visit milestone and unlocks personal ranking | `app/(tabs)/list.js` |
| `post_liked` | User likes a post in the Discover feed | `app/(tabs)/discover.js` |
| `friend_request_accepted` | User accepts an incoming friend request | `app/(tabs)/friends.js` |
| `venue_shared_to_dm` | User shares a venue card into a DM or group conversation | `app/conversation/share-venue.js` |

## Next steps

We've built a dashboard and five insights to monitor user behavior based on the events just instrumented:

- [Analytics basics (wizard) dashboard](https://us.posthog.com/project/479197/dashboard/1739912)
- [Signup → Onboarding conversion](https://us.posthog.com/project/479197/insights/oNG7mMNb) — funnel from account creation to profile completion
- [Venue views → Visit logged conversion](https://us.posthog.com/project/479197/insights/ADJgpvK3) — funnel from venue detail view to rating submission
- [Visits logged over time](https://us.posthog.com/project/479197/insights/QAkvc7sq) — daily unique users hitting the core conversion
- [Ranking engagement: comparisons & rank unlocks](https://us.posthog.com/project/479197/insights/FR7FDPBH) — adoption of the comparison/ranking loop
- [Social feature adoption](https://us.posthog.com/project/479197/insights/1EyWMVIg) — friendships made and venues shared in DMs

## Verify before merging

- [ ] Run a full production build (the wizard only verified the files it touched) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `POSTHOG_PROJECT_TOKEN` and `POSTHOG_HOST` to `.env.example` and any bootstrap scripts so collaborators know what to set.
- [ ] Confirm the returning-visitor path also calls `identify` — the `onAuthStateChanged` handler in `contexts/AuthContext.js` now does this, but verify it fires correctly on a cold app launch with a persisted Firebase session.

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-expo/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.
