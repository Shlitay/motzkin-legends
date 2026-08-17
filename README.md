# Motzkin Legends — Prediction League

Private prediction game for a closed friend group. One manager (you) approves
participants each round after they pay via Paybox; participants predict the
score of 7 Israeli league matches per round and compete for a jackpot.

**Live:** https://motzkin-legends.vercel.app
**Repo:** https://github.com/Shlitay/motzkin-legends
**Supabase project:** `teuqvtarqminvutoozsx`

## Status: deployed, real auth works, rest of the app still on mock data

Login (Google OAuth) and onboarding (avatar + default score) write to the
real Supabase database. Everything past that — predictions, home stats,
leaderboard, manager dashboard — still reads/writes `src/lib/mock-data.ts`,
not the real tables. So right now: a friend can log in and register for
real, but predicting/approving/stats don't persist anywhere yet.

**Also:** the Google OAuth consent screen is still in **Testing** mode —
only Google accounts added as test users can log in at all; anyone else is
blocked outright. Not ready to send to friends until this is fixed.

## Next session — before sending this to friends for real

1. **Publish the Google OAuth consent screen** (Google Cloud Console →
   Audience → Publish App). Removes the test-user restriction so any Google
   account can log in — no more manual allow-listing per friend. Since the
   app only requests basic profile/email scopes, this shouldn't require
   Google's formal verification review.
2. **Finish wiring the app to real Supabase** so what friends do actually
   saves to the DB:
   - Seed real round 1 (season + round + the 7 matches) into Supabase
   - Wire `/predictions` to read real matches and write real `predictions` rows (replacing the `localStorage` stand-in)
   - Wire `/home` and `/leaderboard` to read real `round_participation` / `season_stats`
   - Wire `/manager` approve/reject/reset to real `round_participation` writes
3. Do a small real dry run yourself (or with one friend) end-to-end before opening it up to everyone.

## Getting started (local dev)

This is a [Next.js](https://nextjs.org) app (TypeScript, Tailwind v4, App Router).

```bash
npm install   # if you haven't already
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Needs `.env.local` with
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (already set up
locally — not committed, since it's gitignored).

## What's built

**Pages** (all under `src/app/`):
- `/` and `/manager/login` — real Google sign-in (Supabase Auth)
- `/onboarding` — required first-login step: pick an avatar, set a default score — writes to the real `users` row
- `/home` — last-round + season stat cards (towards / points / hit); still mock data, all zero
- `/predictions` — real round 1 fixtures (22.8.2026, kickoff shown on-page), 3 states (empty → filled → submitted/history), kit-colored team dots, win/draw tinting. Still mock: submitting saves to `localStorage`, not the DB.
- `/leaderboard` — three tables (this round's points, season points, most played), full participant roster, still mock/zero
- `/rules`
- `/manager` — approve/un-approve participants, leaderboard, reset-round flow — still mock; real route protection *is* live (only `role = 'manager'` accounts can reach it)

**Admin/participant switching:** every page's top bar (`TopBar.tsx`) links to
the other side — "Admin panel" on participant pages, "Back to game" on the
manager dashboard, since you're the only manager and use both views.

**Auth & backend** (real, live):
- Google OAuth via Supabase Auth — `src/lib/supabase/{client,server,middleware}.ts`, `src/proxy.ts` (Next.js 16 renamed `middleware.ts` → `proxy.ts` — same thing)
- `src/app/auth/callback/route.ts` — exchanges the OAuth code, routes to `/onboarding` if the profile's default scores are still unset
- `proxy.ts` refreshes the session on every request and gate-keeps `/manager/*` behind `role = 'manager'` — real server-side protection, not just a hidden link
- `schema.sql` — full data model, run against the real project
- `rls.sql` — Row Level Security policies, also applied. Everyone can read shared game data (rounds/matches/teams/scoring); only the manager can write it. Each user reads/writes only their own profile & predictions. A trigger blocks anyone from self-promoting to `role = 'manager'` through the app.
- **To become the manager**, run once in the Supabase SQL editor after your first login: `update users set role = 'manager' where email = 'contact@shlitay.com';`

**Design system — "Home Pitch" kit** (turf green + trophy gold):
- Brand colors as Tailwind v4 theme tokens in `src/app/globals.css` (`bg-brand`, `text-muted`, `bg-draw`, etc.)
- Typefaces: Oswald (headlines/scores/numbers) + Work Sans (body), loaded via `next/font/google` in `src/lib/fonts.ts`; Caveat (handwriting) for the logo signature only
- Logo: 1X2-icon + handwritten "Motzkin Legends" — `src/components/Logo.tsx` (large, login hero) and `src/components/TopBar.tsx` (compact, fixed top bar on every app page)
- A living style guide comparing this kit against two alternatives (Floodlights, Derby Day) was built as a Claude Artifact during design — ask if you want it re-shared; it's not part of this repo.

## UI reference
`Prediction game for users.drawio.pdf` — original wireframes. Superseded in spirit by what's actually built, but still useful for the manager fixture-entry screen, which isn't built yet.

## Still to build (Phase 0 — on hold, pending info from you)
1. Manager fixture-entry screen — no UI yet to type in a round's 7 matches + deadline; "Reset round" currently just clears mock lists.
2. Manager result-entry — input final scores once matches finish.
3. Scoring engine — compute `points_earned` per prediction, update `round_participation` (totals, rank, `is_round_winner`).
4. Auto-lock scheduled job (fills in default scores at deadline).
5. Fun/social layer (crown UI, trash-talk — no table designed yet).

## Open items still worth nailing down
- Exact wording/UI for the manager's scoring-rules settings screen.
- Whether default-score predictions should visually differ for the participant (e.g. a badge like "auto-filled").
- Does the manager's own account also play/predict, or is it admin-only? (Currently `season_stats` excludes `role = 'manager'` rows entirely — but the Admin panel / Back to game links assume one person uses both views.)
- Design of the trash-talk/social feature.
