"use client";

import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import { ChevronIcon } from "@/components/icons";
import NewsTicker from "@/components/NewsTicker";
import RoundApprovalStatus from "@/components/RoundApprovalStatus";
import RoundCountdown from "@/components/RoundCountdown";
import TopBar from "@/components/TopBar";
import { createClient } from "@/lib/supabase/client";
import { formatIsraelDeadline, formatIsraelTime, formatMatchKickoff } from "@/lib/israelTime";
import { lockExpiredRounds } from "@/lib/lockExpiredRounds";
import { TEAM_LOGOS, shortTeamName } from "@/lib/mock-data";
import { matchStatus, type MatchStatus } from "@/lib/matchStatus";

type ScoreEntry = { home: string; away: string; pointsEarned: number | null };

type DbMatch = {
  id: string;
  home_team: string;
  away_team: string;
  kickoff_at: string;
  home_score: number | null;
  away_score: number | null;
  is_final: boolean;
};

type DbRound = {
  id: string;
  round_number: number;
  deadline_at: string;
  status: string;
};

export default function PredictionsPage() {
  const [supabase] = useState(() => createClient());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [rounds, setRounds] = useState<DbRound[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [matches, setMatches] = useState<DbMatch[]>([]);
  const [entries, setEntries] = useState<Record<string, ScoreEntry>>({});
  const [submitted, setSubmitted] = useState(false);
  const [now, setNow] = useState(() => new Date());

  // Drives the not-started -> live transition for whichever match's kickoff
  // just passed while this page is sitting open.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Load every round once; default to whichever one is 'open'.
  useEffect(() => {
    (async () => {
      await lockExpiredRounds(supabase);

      const { data, error: roundsError } = await supabase
        .from("rounds")
        .select("id, round_number, deadline_at, status")
        .order("round_number", { ascending: true });

      if (roundsError) {
        setError(roundsError.message);
        setLoading(false);
        return;
      }

      const roundList = data ?? [];
      setRounds(roundList);
      const openRound = roundList.find((r) => r.status === "open") ?? roundList[roundList.length - 1];
      if (openRound) {
        setSelectedRoundId(openRound.id);
      } else {
        setLoading(false);
      }
    })();
  }, [supabase]);

  // Whenever the selected round changes, load its matches + this user's
  // existing predictions for it.
  useEffect(() => {
    if (!selectedRoundId) return;
    setLoading(true);

    (async () => {
      const { data: matchRows, error: matchesError } = await supabase
        .from("matches")
        .select("id, home_team, away_team, kickoff_at, home_score, away_score, is_final")
        .eq("round_id", selectedRoundId)
        .order("kickoff_at");

      if (matchesError) {
        setError(matchesError.message);
        setLoading(false);
        return;
      }

      const matchList = matchRows ?? [];
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let predictionRows: {
        match_id: string;
        pred_home_score: number;
        pred_away_score: number;
        points_earned: number | null;
      }[] = [];
      if (user && matchList.length > 0) {
        const { data } = await supabase
          .from("predictions")
          .select("match_id, pred_home_score, pred_away_score, points_earned")
          .eq("user_id", user.id)
          .in("match_id", matchList.map((m) => m.id));
        predictionRows = data ?? [];
      }

      const byMatch = new Map(predictionRows.map((p) => [p.match_id, p]));
      const nextEntries: Record<string, ScoreEntry> = {};
      matchList.forEach((m) => {
        const existing = byMatch.get(m.id);
        nextEntries[m.id] = existing
          ? {
              home: String(existing.pred_home_score),
              away: String(existing.pred_away_score),
              pointsEarned: existing.points_earned,
            }
          : { home: "", away: "", pointsEarned: null };
      });

      setMatches(matchList);
      setEntries(nextEntries);
      setSubmitted(matchList.length > 0 && predictionRows.length === matchList.length);
      setError(null);
      setLoading(false);
    })();
  }, [supabase, selectedRoundId]);

  const selectedRound = rounds.find((r) => r.id === selectedRoundId) ?? null;
  const isOpenRound = selectedRound?.status === "open";

  // rounds is already ordered by round_number ascending (the fetch query's
  // own sort), so adjacent array entries are adjacent rounds.
  const selectedRoundIndex = rounds.findIndex((r) => r.id === selectedRoundId);
  const previousRound = selectedRoundIndex > 0 ? rounds[selectedRoundIndex - 1] : null;
  const nextRound =
    selectedRoundIndex >= 0 && selectedRoundIndex < rounds.length - 1
      ? rounds[selectedRoundIndex + 1]
      : null;

  const allFilled =
    matches.length > 0 &&
    matches.every((m) => entries[m.id]?.home !== "" && entries[m.id]?.away !== "");

  // Live matches first, then upcoming, then ended — kickoff_at order (the
  // DB query's own sort) is preserved within each group since Array#sort
  // is stable.
  const sortedMatches = [...matches].sort(
    (a, b) =>
      STATUS_ORDER[matchStatus(a.kickoff_at, a.is_final, now)] -
      STATUS_ORDER[matchStatus(b.kickoff_at, b.is_final, now)]
  );
  const firstEndedIndex = sortedMatches.findIndex(
    (m) => matchStatus(m.kickoff_at, m.is_final, now) === "ended"
  );

  function setScore(matchId: string, side: "home" | "away", value: string) {
    if (value !== "" && !/^\d$/.test(value)) return;
    setEntries((prev) => ({ ...prev, [matchId]: { ...prev[matchId], [side]: value } }));
  }

  async function sendPrediction() {
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("התנתקתם מהמערכת — יש להתחבר מחדש.");
      setSaving(false);
      return;
    }

    const rows = matches.map((m) => ({
      user_id: user.id,
      match_id: m.id,
      pred_home_score: Number(entries[m.id].home),
      pred_away_score: Number(entries[m.id].away),
    }));

    const { error: upsertError } = await supabase
      .from("predictions")
      .upsert(rows, { onConflict: "user_id,match_id" });

    if (upsertError) {
      setError(upsertError.message);
      setSaving(false);
      return;
    }

    setSubmitted(true);
    setSaving(false);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 pt-20 text-center">
        <TopBar />
        <p className="text-sm text-muted">טוען...</p>
      </main>
    );
  }

  if (!selectedRound) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 pt-20 text-center">
        <TopBar />
        <p className="text-sm text-muted">אין עדיין מחזור פתוח.</p>
        <BottomNav />
      </main>
    );
  }

  const heading = !isOpenRound || submitted
    ? "צפייה בניחושים שהגשתם"
    : "הזינו את הניחושים למחזור";

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-6 pb-24 pt-20">
      <TopBar />
      <NewsTicker />
      <RoundApprovalStatus />
      <RoundCountdown />
      <div className="text-center">
        <h1 className="text-lg font-medium">{heading}</h1>
        <div className="mt-1 flex items-center justify-center gap-3">
          <button
            onClick={() => previousRound && setSelectedRoundId(previousRound.id)}
            disabled={!previousRound}
            aria-label="מחזור קודם"
            className="text-muted enabled:hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronIcon size={16} className="rotate-180" />
          </button>
          <p className="text-sm text-muted">
            מחזור {selectedRound.round_number} · ההגשה {isOpenRound ? "נסגרת" : "נסגרה"}{" "}
            {formatIsraelDeadline(selectedRound.deadline_at)}
          </p>
          <button
            onClick={() => nextRound && setSelectedRoundId(nextRound.id)}
            disabled={!nextRound}
            aria-label="מחזור הבא"
            className="text-muted enabled:hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronIcon size={16} />
          </button>
        </div>
      </div>

      <div className="w-full max-w-md space-y-4">
        {sortedMatches.map((m, i) => {
          const e = entries[m.id];
          const readOnly = !isOpenRound || submitted;
          const status = matchStatus(m.kickoff_at, m.is_final, now);
          return (
            <div key={m.id}>
              {i === firstEndedIndex && <SectionDivider label="משחקים שהסתיימו" />}
              {status !== "ended" ? (
                <MatchRow
                  homeTeam={m.home_team}
                  awayTeam={m.away_team}
                  home={e.home}
                  away={e.away}
                  readOnly={readOnly}
                  onChangeHome={readOnly ? undefined : (v) => setScore(m.id, "home", v)}
                  onChangeAway={readOnly ? undefined : (v) => setScore(m.id, "away", v)}
                  finalHomeScore={m.home_score}
                  finalAwayScore={m.away_score}
                  status={status}
                  kickoffAt={m.kickoff_at}
                />
              ) : (
                m.home_score !== null &&
                m.away_score !== null && (
                  <EndedMatchCard
                    homeTeam={m.home_team}
                    awayTeam={m.away_team}
                    predHome={Number(e.home)}
                    predAway={Number(e.away)}
                    actualHome={m.home_score}
                    actualAway={m.away_score}
                    points={e.pointsEarned}
                    kickoffAt={m.kickoff_at}
                  />
                )
              )}
            </div>
          );
        })}
      </div>

      {isOpenRound &&
        (submitted ? (
          <button
            onClick={() => setSubmitted(false)}
            className="rounded-full bg-draw px-8 py-2 font-medium text-white hover:brightness-95"
          >
            עדכון ניחוש
          </button>
        ) : (
          <button
            disabled={!allFilled || saving}
            onClick={sendPrediction}
            className="rounded-full bg-brand px-8 py-2 font-medium text-white enabled:hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            {saving ? "שומר..." : allFilled ? "שליחת ניחוש" : "השלימו את הניחושים"}
          </button>
        ))}

      {error && <p className="text-sm text-danger">{error}</p>}

      <BottomNav />
    </main>
  );
}

const STATUS_ORDER: Record<MatchStatus, number> = { live: 0, "not-started": 1, ended: 2 };

// Ended matches use EndedMatchCard's own outcome label instead of this
// badge, so it only ever renders for the other two statuses.
function MatchStatusBadge({ status }: { status: Exclude<MatchStatus, "ended"> }) {
  const config: Record<Exclude<MatchStatus, "ended">, { label: string; dot: string; bg: string; text: string; border: string }> = {
    "not-started": { label: "טרם החל", dot: "bg-neutral-400", bg: "bg-neutral-100", text: "text-neutral-500", border: "" },
    live: { label: "בשידור חי", dot: "bg-brand animate-pulse", bg: "bg-brand/10", text: "text-brand", border: "border border-black" },
  };
  const c = config[status];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${c.bg} ${c.text} ${c.border}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <div className="h-px flex-1 bg-neutral-200" />
      <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      <div className="h-px flex-1 bg-neutral-200" />
    </div>
  );
}

// Live and not-started matches only — ended matches render via
// EndedMatchCard instead (see its own component below).
function MatchRow({
  homeTeam,
  awayTeam,
  home,
  away,
  onChangeHome,
  onChangeAway,
  readOnly = false,
  finalHomeScore = null,
  finalAwayScore = null,
  status,
  kickoffAt,
}: {
  homeTeam: string;
  awayTeam: string;
  home: string;
  away: string;
  onChangeHome?: (v: string) => void;
  onChangeAway?: (v: string) => void;
  readOnly?: boolean;
  finalHomeScore?: number | null;
  finalAwayScore?: number | null;
  status: Exclude<MatchStatus, "ended">;
  kickoffAt: string;
}) {
  const homeNum = home === "" ? null : Number(home);
  const awayNum = away === "" ? null : Number(away);
  const hasBoth = homeNum !== null && awayNum !== null;
  const isDraw = hasBoth && homeNum === awayNum;
  const homeWins = hasBoth && homeNum! > awayNum!;
  const awayWins = hasBoth && awayNum! > homeNum!;

  const teamClass = (winning: boolean) =>
    isDraw ? "bg-draw/15 border-draw/45" : winning ? "bg-brand/15 border-brand/40" : "border-neutral-200";

  // A match that genuinely hasn't started yet has no real result to show,
  // even if its score happens to be sitting at 0-0 in the DB (the pre-fix
  // 0-0 seeding wasn't kickoff-gated, so this also guards against stale
  // production data until that migration is run).
  const hasFinalScore = status !== "not-started" && finalHomeScore !== null && finalAwayScore !== null;

  return (
    <div className="rounded-xl border border-neutral-200 bg-surface p-3">
      {status === "not-started" ? (
        // justify-between with the badge first in DOM puts it at the box's
        // top right (RTL start) and the kickoff time at top left (RTL end).
        <div className="mb-2 flex items-center justify-between">
          <MatchStatusBadge status={status} />
          <span className="text-xs text-muted" dir="ltr">
            {formatMatchKickoff(kickoffAt)}
          </span>
        </div>
      ) : (
        <div className="mb-2 flex justify-center">
          <MatchStatusBadge status={status} />
        </div>
      )}
      <div className="flex items-center gap-2">
        <div className={`flex flex-1 items-center gap-2.5 overflow-hidden rounded-lg border py-3 pe-3 text-sm ${teamClass(homeWins)}`}>
          <TeamLogo team={homeTeam} />
          <span>{shortTeamName(homeTeam)}</span>
        </div>
        <ScoreBox value={home} onChange={onChangeHome} readOnly={readOnly} />
        <ScoreBox value={away} onChange={onChangeAway} readOnly={readOnly} />
        <div className={`flex flex-1 items-center justify-end gap-2.5 overflow-hidden rounded-lg border py-3 ps-3 text-end text-sm ${teamClass(awayWins)}`}>
          <span>{shortTeamName(awayTeam)}</span>
          <TeamLogo team={awayTeam} />
        </div>
      </div>
      {hasFinalScore && (
        // The row above is a flex row that mirrors under the page's global
        // RTL — home_box is DOM-first so it lands visually *rightmost*,
        // away_box visually *leftmost*. This plain-text line doesn't
        // participate in that flex mirroring, so its number order has to
        // be set to match by hand: away score first (aligns under the
        // away box on the left), home score second (aligns under the home
        // box on the right) — not source/home-first, which would silently
        // mismatch the row's actual left-right layout.
        <p className="mt-1 text-center text-xs text-muted">
          תוצאה נוכחית: {finalAwayScore}-{finalHomeScore}
        </p>
      )}
    </div>
  );
}

type Outcome = "exact" | "direction" | "miss";

// Mirrors the exact/direction/miss comparison in submit_match_result() and
// lock_expired_rounds() (see fix-round1-kickoff-times.sql's sibling
// migrations) — derived from the raw scores rather than from the points
// value itself, since scoring_rules' point amounts are manager-configurable
// and shouldn't be hardcoded into which color tier a card gets.
function deriveOutcome(predHome: number, predAway: number, actualHome: number, actualAway: number): Outcome {
  if (predHome === actualHome && predAway === actualAway) return "exact";
  if (Math.sign(predHome - predAway) === Math.sign(actualHome - actualAway)) return "direction";
  return "miss";
}

const OUTCOME_STYLES: Record<
  Outcome,
  { rail: string; pointsBg: string; pointsBorder: string; pointsText: string; caption: string; label: string }
> = {
  exact: {
    rail: "bg-[oklch(0.62_0.14_150)]",
    pointsBg: "bg-[oklch(0.96_0.035_150)]",
    pointsBorder: "oklch(0.92 0.05 150)",
    pointsText: "text-[oklch(0.42_0.11_150)]",
    caption: "text-[oklch(0.55_0.08_150)]",
    label: "ניחוש מדויק",
  },
  direction: {
    rail: "bg-[oklch(0.75_0.14_80)]",
    pointsBg: "bg-[oklch(0.97_0.04_85)]",
    pointsBorder: "oklch(0.93 0.06 85)",
    pointsText: "text-[oklch(0.5_0.11_80)]",
    caption: "text-[oklch(0.6_0.08_80)]",
    label: "כיוון נכון",
  },
  miss: {
    rail: "bg-[#d6d5cf]",
    pointsBg: "bg-[#faf9f7]",
    pointsBorder: "#ecebe6",
    pointsText: "text-[#b5b5ad]",
    caption: "text-[#c4c4bc]",
    label: "פספוס",
  },
};

// Design handoff: "Prediction Result Card" (variant 1B), 2026-08-24 —
// status rail + body + points column, recreated pixel-for-pixel from the
// exported .dc.html spec rather than the earlier gold/silver/gray tier
// card it replaces.
function EndedMatchCard({
  homeTeam,
  awayTeam,
  predHome,
  predAway,
  actualHome,
  actualAway,
  points,
  kickoffAt,
}: {
  homeTeam: string;
  awayTeam: string;
  predHome: number;
  predAway: number;
  actualHome: number;
  actualAway: number;
  points: number | null;
  kickoffAt: string;
}) {
  const outcome = deriveOutcome(predHome, predAway, actualHome, actualAway);
  const s = OUTCOME_STYLES[outcome];
  const pointsLabel = points === null ? "" : points > 0 ? `+${points}` : "0";

  return (
    <div className="flex overflow-hidden rounded-[18px] border border-[#e6e6e1] bg-white shadow-[0_1px_2px_rgba(17,17,17,.04)]">
      {/* Explicit corner rounding on the rail/points column too, not just
          relying on the parent's overflow-hidden clip — belt-and-braces
          so their own colored backgrounds definitely get the card's
          curve on their outer edge (rail = right side, points = left
          side, since the row visually mirrors under RTL). */}
      <div className={`w-[5px] shrink-0 rounded-r-[18px] ${s.rail}`} />
      <div className="flex-1 px-4 py-3.5">
        <div className="mb-2.5 flex items-center justify-between">
          {/* First DOM child renders at the box's RTL start (right) — this
              must be the meta text, not the outcome label, matching the
              design source's own child order (metaText, then
              outcomeLabel). Confirmed against the .dc.html source and a
              rendered screenshot, not assumed from the README prose alone,
              since an earlier version of this file swapped these. */}
          <span className="text-[11px] font-extrabold tracking-[.08em] text-[#a3a39b]">
            הסתיים · {formatIsraelTime(kickoffAt)}
          </span>
          <span className={`text-[11px] font-extrabold tracking-[.08em] ${s.pointsText}`}>{s.label}</span>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3.5">
          <div className="flex flex-col items-center gap-[7px]">
            <TeamCrest team={homeTeam} />
            <span className="text-[13px] font-bold text-ink">{shortTeamName(homeTeam)}</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span
              className="font-display text-[34px] font-black leading-none tracking-[0.02em] tabular-nums text-ink"
              dir="ltr"
              style={{ unicodeBidi: "isolate" }}
            >
              {actualHome} : {actualAway}
            </span>
            <span className={`text-xs font-semibold tabular-nums text-[#a3a39b] ${outcome === "miss" ? "line-through" : ""}`}>
              ניחשת{" "}
              <span dir="ltr" style={{ unicodeBidi: "isolate" }}>
                {predHome} : {predAway}
              </span>
            </span>
          </div>
          <div className="flex flex-col items-center gap-[7px]">
            <TeamCrest team={awayTeam} />
            <span className="text-[13px] font-bold text-ink">{shortTeamName(awayTeam)}</span>
          </div>
        </div>
      </div>
      <div
        className={`flex w-[86px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-l-[18px] ${s.pointsBg}`}
        style={{ borderInlineStart: `1px solid ${s.pointsBorder}` }}
      >
        <span
          className={`text-[28px] font-black leading-none ${s.pointsText}`}
          dir="ltr"
          style={{ unicodeBidi: "isolate" }}
        >
          {pointsLabel}
        </span>
        <span className={`text-[11px] font-bold ${s.caption}`}>נקודות</span>
      </div>
    </div>
  );
}

function TeamCrest({ team }: { team: string }) {
  const src = TEAM_LOGOS[team];
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#eceae4]">
      {src && <img src={src} alt="" className="h-8 w-8 object-contain" />}
    </div>
  );
}

function TeamLogo({ team }: { team: string }) {
  const src = TEAM_LOGOS[team];
  if (!src) return null;
  return <img src={src} alt="" className="h-7 w-7 shrink-0 object-contain" />;
}

function ScoreBox({
  value,
  onChange,
  readOnly,
}: {
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
}) {
  if (readOnly) {
    return (
      <div className="font-display flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">
        {value}
      </div>
    );
  }
  return (
    <input
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      inputMode="numeric"
      maxLength={1}
      className="h-7 w-7 shrink-0 rounded border border-neutral-300 text-center text-xs"
    />
  );
}
