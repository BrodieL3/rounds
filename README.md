# Rounds

**Site:** [rounds-web-bice.vercel.app](https://rounds-web-bice.vercel.app) — coming soon to iPhone (lander source in `lander/`)

Rounds is a social nightlife discovery app: rate the bars and clubs you visit, compare them head-to-head, and build a personal ranking you can share with friends. Think "Beli for nightlife."

## How it works

- **Rate** — After a visit, log a quick sentiment (`loved` / `fine` / `disliked`) with notes, photos, and companion tags. Public ratings project into a social feed with likes, comments, and bookmarks.
- **Compare** — Pairwise matchups between venues in the same cohort (cocktail bar, wine bar, sports bar, pub, night club, dive bar). A "too tough" escape hatch keeps forced choices honest.
- **Rank** — Personal rankings are computed with a per-user **Bayesian Bradley–Terry model**, ranked by posterior lower bound so sparse comparison data doesn't produce overconfident orderings (see ADR 010; this replaced an earlier Elo approach).
- **Friends-first** — DMs, group chats, polls, location pins, voice notes, and venue/review sharing came before any public-graph features (ADR 003).

## Market scoping

The beta catalog is deliberately market-scoped: Boston and Cambridge only (ADR 007), with cohort-isolated peer pools so a dive bar never competes with a cocktail bar. Product decisions are documented as they were made:

- `docs/adr/` — 10 architecture decision records, including an assessment of Eventbrite-alternative event data sources (ADR 002) and an API capability synthesis across venue-data providers (ADR 001)
- `docs/prd/` — product backlog with prioritized slices
- `CONTEXT-MAP.md` — source-of-truth index for all project docs

## Stack

Expo / React Native (SDK 54) · Firebase (Auth, Firestore, Storage, security-rules test suite) · PostHog product analytics · OpenStreetMap static maps

## Development

```bash
npm install
cp .env.example .env   # fill in Firebase web app keys
npm start              # Expo dev server (i for iOS simulator, w for web)
npm test               # unit tests
npm run test:rules     # Firestore security-rules tests (requires firebase emulators)
```

A static web build lives in `dist/` (`npx expo export -p web`).
