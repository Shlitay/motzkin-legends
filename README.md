# Motzkin Legends — Prediction League

Private prediction game for a closed friend group. One manager (you) approves
participants each round after they pay via Paybox; participants predict the
score of 7 Israeli league matches per round and compete for a jackpot.

## Status: UI built on mock data, not yet wired to a real backend

Everything below runs locally against fake data in `src/lib/mock-data.ts` —
no Supabase project exists yet, so nothing persists across a refresh and
there's no real login. That's the next step (see "What's left" below).

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
- `/home` — last-round + season stat cards (towards / points / hit)
- `/predictions` — 3 states (empty → filled → submitted/history), with kit-colored team dots and win/draw tinting
- `/leaderboard` — most-winning / most-played tables, gold/silver/bronze row tinting for top 3
- `/rules`
- `/manager` — approve/un-approve participants, leaderboard, reset-round flow

**Design system — "Home Pitch" kit** (turf green + trophy gold):
- Brand colors as Tailwind v4 theme tokens in `src/app/globals.css` (`bg-brand`, `text-muted`, `bg-draw`, etc.)
- Typefaces: Oswald (headlines/scores/numbers) + Work Sans (body), loaded via `next/font/google` in `src/lib/fonts.ts`; Caveat (handwriting) for the logo signature only
- Logo: 1X2-icon + handwritten "Motzkin Legends" — `src/components/Logo.tsx` (large, login hero) and `src/components/TopBar.tsx` (compact, fixed top-left on every app page)
- A living style guide comparing this kit against two alternatives (Floodlights, Derby Day) was built as a Claude Artifact during design — ask if you want it re-shared; it's not part of this repo.

**Data model** (`schema.sql`, full Postgres/Supabase schema — not yet run against a real database):
- `users` (profile row keyed to Supabase Auth's `auth.users.id`, no passwords), `scoring_rules`, `seasons`, `rounds`, `matches`, `teams` (kit colors for all 14 Ligat Ha'Al clubs), `predictions`, `round_participation`, `season_stats` view
- See the file's own header comments for the reasoning behind each decision (scoring is data not code, default-score fallback, Google OAuth, etc.)

## UI reference
`Prediction game for users.drawio.pdf` — original wireframes. Superseded in spirit by what's actually built, but still useful for the manager fixture-entry screen, which isn't built yet.

## What's left

1. **Wire up Supabase.** Create a free dev project, run `schema.sql`, enable the Google OAuth provider (needs a Google Cloud OAuth client). Replace `mock-data.ts` reads with real Supabase queries.
2. **Real auth.** Swap the placeholder "Continue with Google" links for actual Supabase Auth, route to `/onboarding` only when `default_home_score`/`default_away_score` are still null.
3. **Manager fixture entry.** No screen yet for the manager to type in a round's 7 matches — needed for "Reset round" to do anything real.
4. **Scoring engine.** Compute `points_earned` per prediction on result entry, update `round_participation` totals/ranks/`is_round_winner`.
5. **Auto-lock job.** Scheduled function at each round's `deadline_at` to fill in missing predictions with each user's default score.
6. **Fun/social layer (Phase 3).** Crown badge for the round winner (schema supports it via `is_round_winner`, no UI yet), trash-talk/reactions (no table designed yet).
7. **Ship:** separate prod Supabase project + prod Google OAuth client, push to GitHub, deploy to a free Vercel subdomain, prod auto-lock job.
8. Launch round 1 with the real group.

## Open items still worth nailing down
- Exact wording/UI for the manager's scoring-rules settings screen.
- Whether default-score predictions should visually differ for the participant (e.g. a badge like "auto-filled").
- Does the manager's own account also play/predict, or is it admin-only? (Currently `season_stats` excludes `role = 'manager'` rows entirely.)
- Design of the trash-talk/social feature.
