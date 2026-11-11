# Prediction Legends — redesign handoff

This folder is the approved redesign of the app currently called **Motzkin Legends**. Implement it in the existing Next.js + Supabase codebase. Everything below was decided with the owner; where something is still open it is listed under **Open questions**.

## How to use this folder

| Path | What it is |
|---|---|
| `HANDOFF.md` | This spec. The source of truth for behavior and decisions. |
| `boards/*.dc.html` | The design boards. They are written for the design canvas runtime (`support.js`), so they **do not render on their own**. Read them for exact markup, copy, spacing, colors and logic (each has a `class Component` script with the state logic). |
| `screens/` | Empty. The owner can export PNGs of each board from the canvas (Export → PNG) and drop them here for visual reference. |
| `assets/brand/` | `logo-mark.svg` (crowned logo, used in every header), `app-icon.svg`, `favicon.svg`, `icon-crown-exact.svg`. |
| `assets/avatars/` | The 30-avatar library (`avatar-01.svg` … `avatar-30.svg`) + `manifest.json` with the DiceBear seed for each. |
| `assets/crests/` | Team crests used in the boards (copies of files already in `public/team-logos/`). |

### Board index

| Board file | Screen |
|---|---|
| `Main.dc.html` | Brand: logo (direction **A** chosen), app icon sizes, palette, type, header |
| `Avatars.dc.html` | Avatar directions — **A (Croodles) chosen**; B–D are rejected references |
| `States.dc.html` | Match card, 8 states |
| `Participants.dc.html` | Match card with "all participants' predictions" drawer open (live + ended) |
| `Screen.dc.html` | Predictions page during a round |
| `PreRound.dc.html` | Predictions page before the round + floating countdown |
| `Countdown.dc.html` | Countdown button states |
| `Login.dc.html` | Login / landing page |
| `Onboarding.dc.html` | First login: avatar + default result |
| `Profile.dc.html` | Profile bottom sheet (opened from the bottom nav) |
| `Rules.dc.html` | Rules page, tab "חוקי המשחק" (default) |
| `RulesWin.dc.html` | Rules page, tab "חלוקת הקופה" |
| `Leaderboard.dc.html` | Leaderboard, round tab |
| `Season.dc.html` | Leaderboard, season tab |
| `RoundIntro.dc.html` | New-round popup (first visit of each round) |
| `Manager.dc.html` | Manager panel (collapsible sections) |

---

## 1. Rebrand

- Name: **Prediction Legends** everywhere (page titles, metadata, manifest, README, OG tags, `TopBar`, `Logo`, login). Remove "Motzkin" / "מוצקין" / "אורט מוצקין" and the Haim Zuri photo from the login page.
- Wordmark: `PREDICTION` (small, letter-spaced, gold gradient text) over `LEGENDS` (large, cream). Font: Oswald 600/700. Always LTR, even inside RTL layouts.
- Logo mark: `assets/brand/logo-mark.svg` — two flip-score panels showing "2:1" under a gold crown with a small star. Used in **every** header at 38px.
- App icon / favicon: `app-icon.svg`, `favicon.svg` (no crown at small sizes on purpose).
- Rounds have **11 matches** (README and copy currently say 7).
- Every former "star" for an exact hit is now a **crown** (`icon-crown-exact.svg`).

### Tokens

| Token | Value | Use |
|---|---|---|
| `--pitch-900` | `#0B2A17` | logo tile, header buttons |
| `--pitch-800` | `#123F24` | header, primary buttons, dark panels |
| `--pitch-600` | `#1B6B3C` | "right direction" (towards), success |
| `--green-50` | `#E6F2EA` | towards tint |
| `--gold-500` | `#C9A227` | gold reference color |
| `--chalk` | `#F7F5EC` | page background |
| `--ink` | `#17231C` | text |
| `--muted` | `#55645A` | secondary text (passes 4.5:1 on chalk) |
| `--miss` | `#D9DAD3` | miss strip |
| `--line` | `#E3E3DC` | borders |

Gold is **never flat** — always the metallic gradient:

```css
--gold: linear-gradient(135deg, #B8901F 0%, #E8C65A 28%, #FFF1B8 48%, #E2BD48 68%, #B8901F 100%);
--gold-light: linear-gradient(135deg, #F6E3A4 0%, #FFF8DC 45%, #F1DA92 100%); /* tints */
```

Gold borders keep rounded corners via `border: 2px solid transparent; background: linear-gradient(#fff,#fff) padding-box, var(--gold) border-box;`. Gold text via `background-clip: text`. In SVG use a `linearGradient` (stops `#A47A14 → #F3D36B → #FFF3C4 → #E0BB45 → #A47A14`).

Fonts: **Heebo** (all Hebrew UI) + **Oswald** (scores, points, numbers, wordmark). Both already in `src/lib/fonts.ts` style; keep `next/font`.

## 2. Global chrome

- **Header** (60px, `--pitch-800`): logo mark + wordmark on the right (start side in RTL), and on the left: jackpot badge (gold gradient pill), **Share** button, **Donate** button. Both are 40px dark circles (`#0B2A17`, border `#2A5A3C`). Share = white share icon; Donate = gold-gradient heart with a small dark `$` inside. Share replaces `InviteFriendsButton` (use `navigator.share` with the game link, fall back to copy). Donate target is still open (see Open questions).
- **Bottom nav** — 4 tabs: ניחושים, טבלה, חוקים, **פרופיל**. The profile tab shows the user's avatar in a 24px gold ring and opens the Profile bottom sheet.
- **Floating countdown** (`PreRound`, `Countdown`): pill above the bottom nav (16px from the left edge, 84px from bottom), 40px tall, dark green with gold border, small gold stopwatch (22px circle) + time only, **HH:MM** (hours may exceed 24, e.g. `52:12`). In the last hour the whole pill becomes gold. Shown on every page with the bottom nav **only until the first kickoff of the round**, then removed. Tap scrolls to the next match without a prediction. `aria-label`: "המחזור מתחיל בעוד X שעות ו־Y דקות". Keep a ≥44px hit area (invisible padding).

## 3. Match card (the core component)

One card covers a match's whole life. Same structure in every state so nothing jumps when the match starts:

1. meta row: status pill (טרם החל / בשידור חי · 67׳ with pulsing dot / הסתיים) + time or label
2. teams row: crest + name | center | crest + name
3. optional "how you can still earn" panel (live only)
4. optional "ניחושי כל המשתתפים" toggle (live + ended only — never before kickoff)
5. bottom strip (always present)

### States

| # | When | Center | Strip |
|---|---|---|---|
| 1 | before kickoff, no prediction | two 46×52 inputs, **dashed gold** border, cream fill | `#FFF6DF` "עוד לא ניחשת" · "ננעל בשריקת הפתיחה" |
| 2 | before kickoff, saved | inputs with **solid green** border | green tint "הניחוש נשמר" · "אפשר לשנות עד הפתיחה" |
| 3 | live, right direction | live score (Oswald 40) + "ניחשת 2:0" chip | **dashed top border**, tint, label + `+5 כרגע` |
| 4 | live, exact | gold colon, gold chip, card gets gold border + glow | gold-light strip, crown, "בול! תחזיקו את התוצאה" `+10 כרגע` |
| 5 | live, miss | neutral | grey dashed "כרגע פספוס, עוד יש זמן" `0 כרגע` |
| 6 | ended, towards | final score | **solid** `#1B6B3C` strip, white text, `+5`/`+6 נקודות` |
| 7 | ended, exact | gold frame + sparkles | **solid gold** strip, crown, "בול! ניחוש מדויק" `+10 נקודות` |
| 8 | ended, miss | prediction struck through | solid `#D9DAD3` "פספוס" `0 נקודות` |

Rule: **live = provisional** (dashed edge, word "כרגע"), **ended = final** (solid, word "נקודות"). Exact = gold + crown, towards = green + trend-up icon, miss = grey + ×. Never color alone.

Label variants for towards: "בכיוון" (5), "כיוון + הפרש" / "בכיוון + הפרש מדויק" (6), "כיוון תיקו" (6).

**Default prediction tag:** when `predictions.is_default = true` (column already exists) show a small grey "ברירת מחדל" chip next to "ניחשת". *(Not drawn on a board yet — keep it small and neutral.)*

### "איך עוד אפשר להרוויח" panel (live only)

Show only scenarios where **more goals** would earn **more points than the player has right now**. Never show "no more goals" or same-status rows. Hide the panel entirely if nothing can improve (e.g. already exact).

Algorithm (goals only go up):
1. Current score `(h, a)`, prediction `(ph, pa)`, current points `p0 = score(ph, pa, h, a)`.
2. Enumerate final scores `(h + x, a + y)` for `x, y ∈ 0..5` (excluding `0,0`).
3. Keep those with `score(...) > p0`. For each distinct points value keep the one with the fewest added goals (`x + y`), tie → smaller `x`.
4. Sort by points desc, then goals asc. Show at most 3 rows.
5. Row copy: "עוד גול ל{team}" / "{n} גולים ל{team}" / "{x} ל{home}, {y} ל{away}", the resulting score, and a chip ("בול +10", "כיוון + הפרש +6", "בכיוון +5").

`score()` must be the same function used for real scoring (see §4).

### "ניחושי כל המשתתפים" drawer

Opens inside the card (button "ניחושי כל המשתתפים ⌄" / "הסתר ניחושים ⌃"). Only after kickoff (unchanged privacy rule). Contents: header "15 ניחושים · נכון לעכשיו" (live) / "· סופי" (ended); a 3-segment bar (gold exact / green towards / grey miss) with counts; then rows ordered by **round rank**: rank, avatar, name, predicted score, outcome chip, points (`+10` gold, `+6`/`+5` green, `0` grey). Current user's row on `#FFF6DF` with "(אתה)".

## 4. Scoring (unchanged logic, make sure UI matches)

From `scoring_rules`: `win_hit_points` 10, `win_towards_points` 5, `draw_hit_points` 10, `draw_towards_points` 6, `goal_diff_bonus_points` 1.

- exact score → hit points (10)
- right winner + same goal difference → towards + bonus (6)
- right winner otherwise → towards (5)
- predicted a draw, ended a draw, not exact → draw towards (6)
- else 0

## 5. Login, onboarding, profile

- **Login** (`Login.dc.html`): dark pitch hero with the large crowned logo, wordmark, tagline in a dark pill "ליגת הניחושים של החבר׳ה", two tilted example result chips in a row under it. Light sheet: headline "נחשו. תפגעו בול. תהיו אגדה." (last line gold), "11 משחקי ליגת העל בכל מחזור, קופה אחת לזוכה.", three steps (Google → 11 matches → ₪20 to the jackpot), Google button (use Google's official "G" mark, not the placeholder), links: manager login, privacy.
- **Onboarding** (`Onboarding.dc.html`, interactive): step 1 avatar grid (6 × 5, all 30), step 2 default result (big inputs + presets 1:1, 1:0, 2:1, 0:0, 1:2; explanation that it is auto-filled for any match not predicted by kickoff). CTA "שמירה ומעבר לניחושים".
- **Profile sheet** (`Profile.dc.html`): bottom sheet over dimmed page. Avatar in gold ring, nickname, full name "· מחובר עם Google", "מאושר למחזור N" badge; stats (place, points, exact count with crown, towards count); nickname input; avatar strip (+ "כל ה־30 אווטארים" opens the full grid); default result inputs; Save; "התנתקות" in red.

### Avatars — unique per player

- Library: the 30 SVGs in `assets/avatars/` (DiceBear **Croodles**, CC BY 4.0). Copy them to `public/avatars/` and replace `AVATAR_LIBRARY` in `src/lib/constants.ts` with the 30 ids (`avatar-01` … `avatar-30`). Store the id in `users.avatar`.
- **Credit required** on the privacy page: "Avatars: remix of “Croodles – Doodle your face” by vijay verma, licensed under CC BY 4.0, via DiceBear." (each SVG also carries this in its `<metadata>`).
- Grid behavior: taken avatars are greyed (`opacity .35; grayscale`), disabled, with the owner's display name under them; the selected one has a green ring and "אתה". Header line "{n} פנויים מתוך 30" and a "הגרלה" button that picks a random free one. On first login a random free avatar is pre-selected.
- Enforce in the DB (see §9). On a unique-violation, show "מישהו בדיוק תפס את האווטאר הזה, בחרו אחר" and refresh the grid.

## 6. Rules page

Top segmented tabs: **"חוקי המשחק"** (default) and **"חלוקת הקופה"**. Title "החוקים", subtitle changes per tab.

- Game rules tab: lock timing (per-day lock, example), scoring list (exact 10 gold, towards+diff 6, draw towards 6, towards 5, miss 0 — each with a "ניחשת X · נגמר Y" example), missed-deadline/default result card with link to profile.
- Jackpot tab: "מי זוכה בקופה" (gold frame) — tiebreakers 1) most points 2) most exacts 3) most points in the main match; then **jackpot split** with its own switch:
  - **Up to ₪300**: 2nd place = 1 free round (₪20), everyone else's remainder → 1st place. 3rd gets nothing.
  - **Over ₪300**: 2nd = 2 free rounds (₪40), 3rd = 1 free round (₪20), remainder → 1st.
  - "סיבוב חינם" = refund of one ₪20 entry.
  - Examples: ₪240 → 220 / 20; ₪360 → 300 / 40 / 20.
  - In the live app the switch can default to the current jackpot's bracket.

## 7. Leaderboard

- Header row: title "טבלת הליגה", round picker (‹ מחזור 12 ›), segmented "המחזור / העונה".
- **Round tab**: match status chips (finished / live / not started), podium for top 3 on a dark green panel (1st: gold block + crown, 2nd silver, 3rd bronze; "אתה" tag on the current user), then rows 4+: rank with ▲/▼ movement (from `round_participation.previous_rank`), avatar, name, exact count (crown) + towards count, points. Tap row → player details (not designed yet).
- **Season tab**: "אגדת העונה" banner for the leader (avatar in gold ring, exacts, rounds, total in gold), then full table: #, avatar, name, exacts, towards, rounds played, points. Top-3 rank numbers tinted gold/silver/bronze; own row highlighted.

## 8. New-round popup

Shown once per user per round (existing `round_intro_seen`). Gold-bordered card over a dimmed page: dark green top with crown, "מחזור חדש נפתח", big gold "מחזור N", close button; then "הודעה מהמנהל" + the manager's title/body (`round_popup.title/body`, `white-space: pre-line`); then a gold "המשחק המרכזי" strip with both crests (match where `is_main_event`); gold CTA "יאללה לנחש"; footnote "ההודעה מופיעה פעם אחת בכל מחזור".

**Decision:** the popup always uses brand colors — `round_popup.main_color` / `bg_color` are no longer used (drop the pickers from the manager UI; columns can stay).

## 9. Manager panel (`/manager`)

Phone-first single page. Header: logo, gold-outline "מנהל" chip, "למשחק" link.

- Round overview panel (dark green): "ברוך שובך", "מחזור N", live-matches pill, tiles: approved, waiting, **jackpot = approved × ₪20 (computed)**, finished/11.
- Quick-link chips to each section (also open that section).
- **All sections collapsible, closed by default.** Header = one button (icon, title, status chip, chevron rotating 180° when open, `aria-expanded`). Plus "לפתוח הכול / לסגור הכול". Status chips when closed: "3 ממתינים" (gold) / "כולם אושרו" (green); "3/11 הסתיימו"; "פעיל"/"מושהה"; scoring summary "10 · 5 · 6 · +1"; "נראתה ע״י 9/12". The auto-update switch stays in its header (usable while closed).
- **Participants**: waiting list in a gold box (avatar, name, registration time, "הסרה", "אישור"); approved grid (2 cols, avatar + name + "return to waiting" icon button); danger zone "איפוס משתתפים מאושרים" (needs a confirm step — not designed yet).
- **Results**: 11 rows: status pill, source tag **אוטומטי** (green) / **ידני** (gold), crown toggle for the main match (gold frame on the card), score inputs (locked/dashed before kickoff). Save button.
- **Auto update** (`ScoreFeedModal` content inline): switch, status line, last update, last check, requests today, note that manual results are never overwritten.
- **Scoring**: −/+ steppers for win hit/towards, draw hit/towards, goal-diff bonus. Save.
- **Round message**: title, body, "נראתה ע״י x/y" chip (from `round_intro_seen`), preview (opens the popup), save.

## 10. Database / backend changes

```sql
-- 1) Unique avatars (allow many NULLs)
create unique index if not exists users_avatar_unique on users (avatar) where avatar is not null;
-- migrate existing emoji avatars: set to NULL (users pick again on next visit) or auto-assign free ids
update users set avatar = null where avatar not like 'avatar-%';

-- 2) Result source, so the live feed never overwrites manual edits
alter table matches add column if not exists result_source text
  check (result_source in ('auto','manual'));
-- manager save → 'manual'; score feed writes only where result_source is distinct from 'manual'
```

- `predictions.is_default` already exists — just render the tag.
- Users with `avatar is null` after the migration should be sent to the avatar step (reuse onboarding step 1).
- Jackpot payouts: compute from approved count; optional table later.

## 11. Implementation notes

- RTL (`dir="rtl"`, `lang="he"`) everywhere; scores/times stay LTR (`dir="ltr"` on score spans).
- Touch targets ≥ 44px; icon-only buttons need Hebrew `aria-label`s (examples in the boards).
- Respect `prefers-reduced-motion` (live dot pulse).
- Prefer CSS variables for the tokens above; replace the old palette in `globals.css`.
- Keep existing data flows; this is a visual + UX redesign plus the two DB changes above.

## Open questions

1. Jackpot of **exactly ₪300** — currently treated as "up to ₪300". Confirm.
2. Donate button target (Paybox / Bit / other link).
3. Should the floating countdown appear on all bottom-nav pages (current spec) or only on predictions?
4. Not yet designed (build simply in the new style, or wait for designs): approval/payment states on the predictions page (not paid → Paybox link, waiting, rejected), player details popup, news ticker, round-end winner announcement, share sheet text, donate sheet, full 30-avatar picker sheet, manager reset confirmation, manager login, privacy page, loading/empty/error/404.
