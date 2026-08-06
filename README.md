# Motzkin Legends — Prediction League

Private prediction game for a closed friend group. One manager (you) approves
participants each round after they pay via Paybox; participants predict the
score of 7 Israeli league matches per round and compete for a jackpot.

## Status: UI built on mock data, not yet wired to a real backend

Everything below runs locally against fake data in `src/lib/mock-data.ts` —
no Supabase project exists yet, so nothing persists across a refresh (except
a `localStorage` stand-in for submitted predictions) and there's no real
login. That's the next step — see "Production plan" below.

## Getting started (local dev)

This is a [Next.js](https://nextjs.org) app (TypeScript, Tailwind v4, App Router).

```bash
npm install   # if you haven't already
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## What's built

**Pages** (all under `src/app/`):
- `/` and `/manager/login` — login screens (Google sign-in button is a placeholder link, not wired to real auth yet)
- `/onboarding` — required first-login step: pick an avatar, set a default score
- `/home` — last-round + season stat cards (towards / points / hit); currently all zero, since round 1 hasn't been played/scored yet
- `/predictions` — real round 1 fixtures (22.8.2026, kickoff shown on-page), 3 states (empty → filled → submitted/history), kit-colored team dots, win/draw tinting. Submitting saves to `localStorage` as a mock stand-in for a real DB write, so it doesn't ask again once you've predicted.
- `/leaderboard` — three tables (this round's points, season points, most played), listing the full participant roster, everyone at 0 until a round is scored
- `/rules`
- `/manager` — approve/un-approve participants, leaderboard, reset-round flow

**Admin/participant switching:** every page's top bar (`TopBar.tsx`) shows a
link to the other side — "Admin panel" on participant pages, "Back to game"
on the manager dashboard — since you're the only manager and will likely use
both views yourself. In the real app this link should only render for the
account with `role = 'manager'`; noted in the code where that check goes.

**Design system — "Home Pitch" kit** (turf green + trophy gold):
- Brand colors as Tailwind v4 theme tokens in `src/app/globals.css` (`bg-brand`, `text-muted`, `bg-draw`, etc.)
- Typefaces: Oswald (headlines/scores/numbers) + Work Sans (body), loaded via `next/font/google` in `src/lib/fonts.ts`; Caveat (handwriting) for the logo signature only
- Logo: 1X2-icon + handwritten "Motzkin Legends" — `src/components/Logo.tsx` (large, login hero) and `src/components/TopBar.tsx` (compact, fixed top bar on every app page)
- A living style guide comparing this kit against two alternatives (Floodlights, Derby Day) was built as a Claude Artifact during design — ask if you want it re-shared; it's not part of this repo.

**Data model** (`schema.sql`, full Postgres/Supabase schema — not yet run against a real database):
- `users` (profile row keyed to Supabase Auth's `auth.users.id`, no passwords), `scoring_rules`, `seasons`, `rounds`, `matches`, `teams` (kit colors for all 14 Ligat Ha'Al clubs), `predictions`, `round_participation`, `season_stats` view
- See the file's own header comments for the reasoning behind each decision (scoring is data not code, default-score fallback, Google OAuth, etc.)
- **No Row Level Security policies yet** — needed before this ever touches real data (see Phase 1 below).

## UI reference
`Prediction game for users.drawio.pdf` — original wireframes. Superseded in spirit by what's actually built, but still useful for the manager fixture-entry screen, which isn't built yet.

## Production plan

The goal: real Google login, a real Supabase backend, deployed, and tested
with real friends. Picking up next session starting at **Phase 1** — Phase 0
is on hold until you provide the production details/info it needs.

- **Phase 0 — finish the missing pieces a real round needs** *(on hold, pending info from you)*
  1. Manager fixture-entry screen — no UI yet to type in a round's 7 matches + deadline; "Reset round" currently just clears mock lists.
  2. Manager result-entry — input final scores once matches finish.
  3. Scoring engine — compute `points_earned` per prediction, update `round_participation` (totals, rank, `is_round_winner`).

- **Phase 1 — create the Supabase project** *(starts next session)*
  1. Create the Supabase project (one project is fine for a friends-only app — a separate dev project is optional).
  2. Run `schema.sql` in the SQL editor.
  3. Enable Row Level Security and write policies (nothing exists yet — without this, the public API key can read/write everything). Minimum: `users` read/update own row; `predictions` owner read/write, manager read-all; `round_participation` everyone read, manager-only write; `matches`/`rounds`/`teams`/`scoring_rules` everyone read, manager-only write.
  4. Note the project's Auth callback URL (`https://<project-ref>.supabase.co/auth/v1/callback`) — needed for Phase 2.

- **Phase 2 — set up Google OAuth**
  1. Google Cloud Console: create/select a project, configure the OAuth consent screen (External, add yourself as a test user).
  2. Create an OAuth 2.0 Client ID (Web application).
  3. Add authorized redirect URIs: the Supabase callback URL, plus `http://localhost:3000` for local dev.
  4. Back in Supabase: Authentication → Providers → Google → paste Client ID + Secret, enable.

- **Phase 3 — wire the app to real Supabase**
  1. `npm install @supabase/supabase-js @supabase/ssr`
  2. Add `.env.local` with the project URL + anon key.
  3. Replace `mock-data.ts` reads with real queries, page by page.
  4. Add real server-side protection for `/manager/*` (middleware or server-side role check — not just the client-side link).
  5. Swap the `localStorage` prediction hack for the real `predictions` table.

- **Phase 4 — deploy**
  1. Push this repo to GitHub (not done yet — currently only a local commit).
  2. Import into Vercel, set the same env vars.
  3. Deploy to the free Vercel subdomain.
  4. Add the live Vercel URL as an authorized redirect URI in both Google Cloud Console and Supabase (auth will fail until this is done).

- **Phase 5 — test with real participants**
  1. Small dry run first — 2–3 friends, one throwaway round, full loop: login → approve → predict → enter results → confirm scoring/leaderboard/crown are right.
  2. Fix whatever breaks.
  3. Open it to the whole group for the real round 1.

- **Later:** auto-lock scheduled job (fills in default scores at deadline), fun/social layer (crown UI, trash-talk — no table designed yet).

## Open items still worth nailing down
- Exact wording/UI for the manager's scoring-rules settings screen.
- Whether default-score predictions should visually differ for the participant (e.g. a badge like "auto-filled").
- Does the manager's own account also play/predict, or is it admin-only? (Currently `season_stats` excludes `role = 'manager'` rows entirely — but the new Admin panel / Back to game links assume one person uses both views.)
- Design of the trash-talk/social feature.
