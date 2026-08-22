# Motzkin Legends — Prediction League

Private prediction game for a closed friend group. One manager (you) approves
participants each round after they pay via Paybox; participants predict the
score of 7 Israeli league matches per round and compete for a jackpot.

**Live:** https://motzkin-legends.vercel.app
**Repo:** https://github.com/Shlitay/motzkin-legends
**Supabase project:** `teuqvtarqminvutoozsx`
**Manager account:** `contact@shlitay.com` (must have `role = 'manager'` in the `users` table — see below if it ever needs re-setting)

## Status: real, deployed, and live-tested with real friends

This is **not** a mock-data demo anymore. Google login, onboarding, predictions,
payment-approval requests, manager approve/reject, and both leaderboards all
read and write the real Supabase database. As of this writing, 6 real
participants have registered and set round 1 predictions.

The whole UI is **Hebrew + RTL** (converted 2026-08-21, straight replace — no
language toggle exists or is planned). `<html lang="he" dir="rtl">` in
`src/app/layout.tsx` drives the mirroring; see "Design system" below for the
font swap this required.

## Getting started (local dev)

```bash
npm install   # if you haven't already
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Needs `.env.local` with
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (gitignored,
already set up locally — values are the same as the Vercel env vars below).

```
NEXT_PUBLIC_SUPABASE_URL=https://teuqvtarqminvutoozsx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_-f7C2NCsa3oGQxFT3aHEtw_vDxNLmyf
```

Deploys automatically on every push to `master` via Vercel's GitHub
integration — no manual deploy step needed.

## What's built and real

**Auth**
- Real Google OAuth via Supabase Auth (`src/lib/supabase/{client,server,middleware}.ts`, `src/proxy.ts` — Next.js 16 renamed `middleware.ts` → `proxy.ts`, same thing)
- `src/app/auth/callback/route.ts` exchanges the OAuth code, routes to `/onboarding` only if avatar/default-score are still unset on the profile row
- `proxy.ts` refreshes the session every request and gate-keeps `/manager/*` behind `role = 'manager'` — real server-side protection
- Google OAuth consent screen is **published** (not Testing mode) — any Google account can log in, no allow-listing needed
- `rls.sql` — Row Level Security on every table. Shared game data (rounds/matches/teams/scoring) is world-readable, manager-only-writable. Each user reads/writes only their own profile & predictions. A trigger blocks self-promotion to `role = 'manager'` through the app — that can only be set directly in SQL

**Pages** (`src/app/`), all wired to real data:
- `/` and `/manager/login` — real Google sign-in
- `/onboarding` — required first login: avatar + default score, writes to `users`
- `/home` — avatar/name (real). Stat cards (towards/points/hit for last round + season) are **still mock/placeholder** — not yet wired.
- **Round approval status** (`RoundApprovalStatus.tsx`) — self-contained (fetches its own open round + the current user's `round_participation` status), shown on `/home`, `/predictions`, `/leaderboard`, `/rules` (not `/manager` — the manager account doesn't participate). Inserts a real `round_participation` row when a participant clicks "שלחתי תשלום דרך Paybox." Status is color-coded: waiting = light orange (`border-draw`/`bg-draw`) with a clock icon, approved = light green (`border-brand`/`bg-brand`) with a checkmark icon, rejected = plain card with red text (not color-coded — wasn't asked for).
- **Round countdown** (`RoundCountdown.tsx`) — same 4 pages as the approval card, a live days/hours/minutes/seconds countdown to the open round's `deadline_at`, ticking every second. The countdown math itself is plain epoch-millisecond subtraction (always correct, timezone doesn't matter for a duration). The displayed kickoff clock time underneath, and `/predictions`' own deadline caption, both go through `formatIsraelDeadline()` (`src/lib/israelTime.ts`) — explicit `Intl.DateTimeFormat(..., { timeZone: "Asia/Jerusalem" })` conversion, not the viewer's own device timezone, since match kickoffs are inherently Israel-local (this replaced `/predictions`' old `formatDeadline`, which implicitly used the browser's local timezone — technically correct today since real participants are in Israel, but wrong if anyone ever checked from abroad).
- `/predictions` — reads real rounds/matches, reads/writes real `predictions` rows (upsert on submit). Generic across rounds (not hardcoded to round 1), though only round 1 exists so far. Round 1 fixtures: 22.8.2026, 20:00. Each match row shows the team's kit colors as a bold, full-height two-tone vertical bar flush against the box's outer edge (`TeamColorBar`, replaced the earlier small side-by-side dots) — built with a negative-margin + `self-stretch` trick to bleed through the box's own padding, verified visually with an isolated Playwright screenshot before shipping since that combination is easy to get subtly wrong.
- `/leaderboard` — three real tables (this round's points, season points, most played), each row **clickable** → opens `ParticipantModal` with that participant's avatar/name/last-round/season stats
- `/home` also now has a **round discussion** section (`RoundComments.tsx`) — one public comment per participant per round, see decision below
- `/rules` — static
- `/manager` — real approve/un-approve (writes `round_participation.payment_status`), real leaderboard widget, a **"Scoring rules" editor** (prefilled from the current `scoring_rules` row, saves a new versioned row — see decision below), and a **"News strip" editor** (see below). **"Reset round" is still local-only / fake** — doesn't touch the database (see Phase 0 below)

**News ticker** (`NewsTicker.tsx`) — a scrolling marquee shown on `/home`, `/predictions`, `/leaderboard`, `/rules`, and `/manager`. Reads a single `news_strip` row with 3 fixed text slots (`slot_1`/`slot_2`/`slot_3`) that the manager overwrites directly from `/manager` → "News strip" (`NewsStripModal.tsx`) — not a list, just 3 boxes; a blank box just doesn't show. Requires migration 9 below. A 4th item is fully automatic (not manager-editable) — the count of `round_participation` rows with `payment_status = 'approved'` for whichever round is currently `open`; skipped entirely if there's no open round. **RTL note**: the ticker is forced `dir="ltr"` — under the page's global RTL, a flex row's natural resting position anchors to its *right* edge and only extends leftward, so the standard duplicate-content-and-translateX(-50%) marquee trick just shrinks the visible content into a growing blank gap instead of looping. This bit twice before being caught with an isolated Playwright test (multi-frame screenshots of the animation, not just a static one) — same fix pattern as the "1X2" logo and the countdown digits.

**Header** (`TopBar.tsx`) — now has a solid white background + 1px bottom border (previously transparent, floating over content), `fixed` + `z-40` so it stays pinned above all normal page content while scrolling. Deliberately kept **below** `z-50`, which every modal (`ProfileModal`, `ScoringRulesModal`, `NewsStripModal`, `ParticipantModal`) uses — a header above the modal layer would poke through a modal's dimmed backdrop instead of being covered by it. Three things live in it besides the logo:
- **Jackpot badge** (`JackpotBadge.tsx`) — gold gradient pill, white text, approved-participant count × a hardcoded ₪20 entry fee (`ENTRY_FEE_ILS` in the component — not manager-configurable, revisit if the buy-in ever changes). Hides itself if there's no open round. Has a looping shine/glint sweep (`.shine-badge` in `globals.css`, respects `prefers-reduced-motion`) — sized to fit the 4-item header at a 390px mobile width without pushing the manager/back link off-screen; verified with zoomed-in Playwright screenshots across the animation cycle since the effect is too subtle to confirm from a single static frame.
- **Invite-friends button** (`InviteFriendsButton.tsx`) — builds `{origin}?ref={slug}` from the current user's Google `full_name` (not nickname — "the name from Google" specifically), e.g. "Itay Arad" → `?ref=itayarad`. Uses the native share sheet (`navigator.share`) on mobile, falls back to clipboard copy on desktop. The `?ref=` param isn't tracked/attributed anywhere yet — this only generates and shares the link, no referral logic was asked for.
- The manager/back-action link (unchanged, existing `resolvedAction` prop).

Every page's `<main>` reserves top padding to clear this fixed header — `pt-28` (112px) was calibrated to the old, shorter transparent header and never revisited after the background/badge/button additions made it taller. Measured the *real* rendered header height with a throwaway route + Playwright bounding-box check (77px) rather than guessing from the Tailwind classes, then set `pt-20` (80px, a ~3px buffer) everywhere `pt-28` appeared — cut the dead space between the header and each page's first content block without risking clipping.

**Favicon** (`src/app/icon.svg`) — Next.js's static-file convention (auto-detected, no `layout.tsx` metadata needed): the "1X2" mark, white on a turf-green rounded square.

**Analytics** — Google Analytics 4 (Measurement ID `G-GX7JT1JLL4`), gated behind `Analytics.tsx` rather than rendering `<GoogleAnalytics>` (from `@next/third-parties/google`) directly. On mount it checks `auth.getUser()` + the `users.role` column, and skips loading GA entirely when the logged-in user is the manager — excludes the manager's own usage from the numbers without relying on GA4's IP-based "internal traffic" filters (unreliable across the manager's different devices/networks). Anonymous visitors (not logged in yet, e.g. the login page) are still tracked; only a *known* manager session is excluded. Verified empirically with a headless-browser network check that the `gtag.js` request actually fires for an anonymous visitor — the manager-exclusion path itself couldn't be verified the same way (no real login available in the dev environment) but reuses the identical role-lookup pattern `TopBar.tsx` already uses successfully in production.

**Profile** (`ProfileModal.tsx`) — real avatar picker, real default-score editor, and a **nickname** field (shown instead of the Google name everywhere a name displays; falls back to the Google name when unset).

**Design system — "Home Pitch" kit** (turf green + trophy gold):
- Tailwind v4 theme tokens in `src/app/globals.css`
- Oswald (numeric displays only — scores, ranks, counts) + **Heebo** (body text and headings, Hebrew+Latin) via `next/font/google`; Caveat (handwriting) for the logo signature only. Heebo replaced Work Sans on 2026-08-21 — Work Sans has no Hebrew glyphs at all, so it silently fell back to a mismatched system font once the UI went Hebrew.
- Logo: "1X2" wordmark (plain text, no border box) + handwritten "Motzkin Legends" — `Logo.tsx` (large, login hero), `TopBar.tsx` (compact, fixed top bar, links back to `/home` on every page via an explicit `BottomNav` "Home" item too). Brand name stays in **Latin script** even in the Hebrew UI (decided during the RTL conversion) — the `OneXTwoIcon` SVG in `icons.tsx` has an explicit `direction: ltr` style, since SVG `<text>` inherits the page's `dir` otherwise and clips/misplaces glyphs (hit this for real during the RTL conversion — the "1" disappeared until that fix landed).
- A living style guide (3 kit alternatives) was built as a Claude Artifact during design — not part of this repo, ask if you want it re-shared

## Database migrations — run in this order on a fresh Supabase project

If ever setting this up again from scratch (or double-checking the current
project has everything applied), run these in the SQL editor in order:

1. `schema.sql` — full data model
2. `rls.sql` — Row Level Security policies
3. `seed-round1.sql` — creates the season, round 1, and its 7 matches
4. `fix-default-score-nullability.sql` — fixes a bug where default scores defaulted to `1` instead of `null`, which broke the "needs onboarding" check (already applied on the live project)
5. `add-avatar-to-season-stats.sql` — extends the `season_stats` view with `avatar` (already applied)
6. `add-nickname.sql` — adds the `nickname` column + extends `season_stats` with `display_name` (already applied, but worth double-checking if anything nickname-related ever errors)
7. `add-round-comments.sql` — creates the `round_comments` table + RLS for the `/home` discussion feature (already applied)
8. `add-lock-expired-rounds-function.sql` — creates `lock_expired_rounds()`, called lazily by the app (on `/home`, `/predictions`, `/leaderboard`, `/manager` load) to lock a round and fill per-match default scores once its deadline passes. It's a no-op for any round whose deadline hasn't passed yet, so applying it doesn't touch round 1's current data (already applied)
9. `add-news-strip.sql` — creates the singleton `news_strip` table + RLS for the manager-editable news ticker (already applied)
10. `add-round-comments-delete-policy.sql` — adds a `delete` RLS policy so a participant can delete their own round comment (to free up their one-per-round slot and post a new one). **Not yet applied** — run this before the "Delete" button on `/home` comments will work.
11. `add-hebrew-team-names.sql` — translates `teams.name` and round 1's existing `matches.home_team`/`away_team` text to Hebrew, as part of the Hebrew/RTL conversion. Pure `UPDATE` of existing rows' text (both tables are free text, not foreign-keyed), doesn't touch `predictions`/`round_participation` at all. **Applied** — `/predictions` shows Hebrew club names and matching kit colors.
12. `add-submit-match-result-function.sql` — creates `submit_match_result()`, called from `/manager`'s "תוצאות מחזור" screen once per match saved: records the score and recomputes every affected participant's `points_earned`/`total_points`/`exact_score_count`/`correct_result_count`/`rank` for the whole round in one go. **Not yet applied** — run this before match results can be entered.

Also, to make the manager account actually a manager (role defaults to
`participant` for everyone, including this account, on first login):
```sql
update users set role = 'manager' where email = 'contact@shlitay.com';
```

## UI reference
`Prediction game for users.drawio.pdf` — original wireframes. Superseded in spirit by what's actually built, but still useful for the manager fixture-entry screen, which isn't built yet.

## Still to build (Phase 0 — on hold, pending info from you)
1. **Manager fixture-entry screen** — no UI yet to type in a round's 7 matches + deadline. This is why "Reset round" is still fake: a real reset means creating a new round + matches, which needs this screen first.
2. ~~**Manager result-entry**~~ — **built** (2026-08-22): `MatchResultsModal.tsx`, opened via "תוצאות מחזור" on `/manager`. Per-match score inputs + a per-row save button, fetches the *latest round overall* (not `status = 'open'` — see the scoring-engine note below for why that filter would break here). Requires migration 12.
3. ~~**Scoring engine**~~ — **built** (2026-08-22): `submit_match_result()` SQL function (migration 12) does the whole recompute — `predictions.points_earned` (exact score beats correct-direction, `sign()` comparison so a predicted draw vs. an actual draw counts as correct-direction too), then a full, non-incremental recompute of `round_participation.total_points`/`exact_score_count`/`correct_result_count`/`rank` for the whole round every time a match is saved (cheap at 7 matches × ~10 participants, and always self-consistent regardless of what order matches get scored in). Deliberately **not** in scope: `is_round_winner`/crown badge (only meaningful once all 7 matches are final — separate concern, see item 6) and auto-transitioning `rounds.status` to `'finished'`. No live-push — this app has no realtime subscriptions anywhere; participants see updated numbers the next time they load or refresh `/predictions`/`/leaderboard`, same fetch-on-mount pattern as everything else. `/predictions` now also shows each match's final score as a small line under the participant's own prediction, once set.
4. ~~**Auto-lock scheduled job**~~ — **built** (2026-08-18): `lock_expired_rounds()` (see migration 8 above) locks a round and fills per-match default scores once its deadline passes, called lazily whenever a round-dependent page loads (`src/lib/lockExpiredRounds.ts`). Requires migration 8 to be applied.
5. **`/home` stat cards** — still mock, needs the same real-data treatment `/leaderboard` already got.
6. **Fun/social layer** — crown badge for round winner (schema supports it via `is_round_winner`, no UI yet); ~~round comments~~ **built** (2026-08-18): `RoundComments.tsx` on `/home`, requires migration 7 to be applied.

## Fixed: "current round" lookups broke once round 1 actually locked (2026-08-23)

Half the app (`NewsTicker`, `JackpotBadge`, `RoundCountdown`, `RoundApprovalStatus`, `/manager`'s participant lists, `/leaderboard`'s round-points table, `/home`'s round-comments section) independently queried `rounds` filtered to `.eq("status", "open")`, several using `.single()`. That's fine right up until a round's deadline actually passes and `lock_expired_rounds()` flips it to `'locked'` — which happened for real on 2026-08-23 (round 1's deadline was 22.8.2026 20:00) and broke `/manager` outright with a PostgREST "Cannot coerce the result to a single JSON object" error, while the other components just silently vanished (no crash, but the jackpot badge, countdown, approval card, etc. all disappeared exactly when the manager started entering results).

Fixed with one shared helper, `getCurrentRound()` in `src/lib/currentRound.ts` — the *latest round overall* (`order by round_number desc limit 1`), not filtered by status — now used by all seven of the above instead of each having its own ad-hoc query. `MatchResultsModal.tsx` already had this exact fix from when it was first built (see item 2 above); this pass generalized it everywhere else and removed the duplication. `predictions/page.tsx` was already unaffected — it fetches every round and falls back to the last one in the list when none is `'open'`.

## Decisions (resolved 2026-08-18, built same day)
- **Scoring-rules settings screen** (in the manager panel): a simple form with two fields — "Exact score points" and "Correct result (towards) points" — prefilled from the current `scoring_rules` row (default 10 / 5). Saving inserts a new versioned row (`effective_from = now()`); past rounds keep whatever scoring was current when they were played. **Built** — `ScoringRulesModal.tsx`, opened from a button on `/manager`. No migration needed (table + RLS already existed).
- **Default-score predictions**: filled in **per match, not per round**. If a participant predicts only some of a round's matches before it locks (e.g. 4 of 7), only the *unpredicted* matches get the default score — and that only happens once the round has started/locked. **Built** — see item 4 above. Still open: exact visual treatment for marking these as auto-filled (badge styling TBD).
- **Does the manager play?** Admin-only. `contact@shlitay.com` is the workspace/manager account and never predicts. Itay's personal participation happens through a separate account, `itay88arad@gmail.com`, which plays like any other participant. The current `season_stats` exclusion of `role = 'manager'` rows is correct as-is — no code change was needed.
- **Trash-talk/social feature — v1 scope**: one public discussion thread per round, shown on `/home`. Any participant can post a comment visible to everyone; each participant can have **at most one comment per round**, enforced both in the UI and by a DB unique constraint on `(round_id, user_id)`. A participant can delete their own comment (`round_comments_delete_own` policy) to free up their one slot and post a new one instead — there's no in-place edit. **Built** — see item 6 above.

## Hebrew + RTL conversion (2026-08-21)

Wording was worked out first in a reviewed glossary (a Claude Artifact, not part of this repo — every English string mapped to a proposed Hebrew one, with review comments applied) before any code changed. Key terms, now used consistently everywhere they appear:
- Scoring vocabulary: **כיוון** ("towards" — correct result, wrong score) and **פגיעה** ("hit" — exact score). Standard Israeli toto-pool language, matches the existing "1X2" branding.
- "Jackpot" → **קופה**.
- Gendered phrasing defaults to **informal plural** for anything addressing the whole group; **masculine singular** only for the one-line manager-specific greeting on `/manager/login` ("ברוך שובך").
- Brand name **"Motzkin Legends" stays in Latin script** — see the `OneXTwoIcon` note under Design system above for the RTL glyph-clipping bug that caused.

**Verification caveat**: only `/` and `/manager/login` were actually visually checked in a browser (screenshotted via Playwright) — every other page requires a real Google-authenticated session, which isn't available in the dev/build environment this was built in. `npx tsc --noEmit` and `next build` both pass, and every English string was swept for with a final grep pass, but `/home`, `/predictions`, `/leaderboard`, `/rules`, `/manager`, and all the modals (Profile, Scoring rules, News strip, Participant popup) still want a real click-through once deployed, especially for RTL layout mirroring (nav icon order, `StatCard`'s `divide-x` stat row, TopBar button side) that wasn't force-verified — it's expected to mirror correctly via the global `dir="rtl"` flip, but wasn't watched happen.
