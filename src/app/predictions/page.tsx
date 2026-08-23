"use client";

import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import { ChevronIcon } from "@/components/icons";
import NewsTicker from "@/components/NewsTicker";
import RoundApprovalStatus from "@/components/RoundApprovalStatus";
import RoundCountdown from "@/components/RoundCountdown";
import TopBar from "@/components/TopBar";
import { createClient } from "@/lib/supabase/client";
import { formatIsraelDeadline } from "@/lib/israelTime";
import { lockExpiredRounds } from "@/lib/lockExpiredRounds";
import { TEAM_COLORS, shortTeamName } from "@/lib/mock-data";
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
        {sortedMatches.map((m) => {
          const e = entries[m.id];
          const readOnly = !isOpenRound || submitted;
          return (
            <MatchRow
              key={m.id}
              homeTeam={m.home_team}
              awayTeam={m.away_team}
              home={e.home}
              away={e.away}
              readOnly={readOnly}
              onChangeHome={readOnly ? undefined : (v) => setScore(m.id, "home", v)}
              onChangeAway={readOnly ? undefined : (v) => setScore(m.id, "away", v)}
              finalHomeScore={m.home_score}
              finalAwayScore={m.away_score}
              isFinal={m.is_final}
              status={matchStatus(m.kickoff_at, m.is_final, now)}
              pointsEarned={e.pointsEarned}
            />
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

function MatchStatusBadge({ status }: { status: MatchStatus }) {
  const config: Record<MatchStatus, { label: string; dot: string; bg: string; text: string; border: string }> = {
    "not-started": { label: "טרם החל", dot: "bg-neutral-400", bg: "bg-neutral-100", text: "text-neutral-500", border: "" },
    live: { label: "בשידור חי", dot: "bg-brand animate-pulse", bg: "bg-brand/10", text: "text-brand", border: "border border-black" },
    ended: { label: "הסתיים", dot: "bg-draw", bg: "bg-white/80", text: "text-draw", border: "" },
  };
  const c = config[status];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${c.bg} ${c.text} ${c.border}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

// Once a match is final, the card itself is colored by how the prediction
// scored — gold for an exact hit, silver for a correct-direction "towards",
// gray for a miss — so the per-team win/draw/loss highlight below would be
// redundant (and clash with the tier background), and is dropped instead.
function resultTierClass(pointsEarned: number | null): string {
  if (pointsEarned === null) return "border-neutral-200 bg-surface";
  if (pointsEarned >= 10) {
    return "glow-border-gold border-[#8a6a1a]/40 text-[#3a2d08] [background:linear-gradient(135deg,#f6e6ab_0%,#d9b74a_35%,#c9a227_65%,#a8811f_100%)]";
  }
  if (pointsEarned > 0) {
    return "glow-border-silver border-[#a8adb5]/50 [background:linear-gradient(135deg,#fbfbfc_0%,#e6e8eb_22%,#c9ccd2_45%,#f2f3f5_65%,#d3d6da_85%,#e9ebed_100%)]";
  }
  return "border-neutral-300 bg-neutral-200";
}

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
  isFinal = false,
  status,
  pointsEarned = null,
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
  isFinal?: boolean;
  status: MatchStatus;
  pointsEarned?: number | null;
}) {
  const homeNum = home === "" ? null : Number(home);
  const awayNum = away === "" ? null : Number(away);
  const hasBoth = homeNum !== null && awayNum !== null;
  const isDraw = hasBoth && homeNum === awayNum;
  const homeWins = hasBoth && homeNum! > awayNum!;
  const awayWins = hasBoth && awayNum! > homeNum!;

  const teamClass = (winning: boolean) => {
    if (isFinal) return "border-black/10 bg-white/60";
    return isDraw
      ? "bg-draw/15 border-draw/45"
      : winning
      ? "bg-brand/15 border-brand/40"
      : "border-neutral-200";
  };

  // A match that genuinely hasn't started yet has no real result to show,
  // even if its score happens to be sitting at 0-0 in the DB (the pre-fix
  // 0-0 seeding wasn't kickoff-gated, so this also guards against stale
  // production data until that migration is run).
  const hasFinalScore = status !== "not-started" && finalHomeScore !== null && finalAwayScore !== null;

  return (
    <div className={`rounded-xl border p-3 ${isFinal ? resultTierClass(pointsEarned) : "border-neutral-200 bg-surface"}`}>
      {isFinal ? (
        // Three-column grid so the badge can sit flush at the box's top
        // right (first column — the rightmost one under this page's
        // global RTL) while the points stay truly centered on the whole
        // row, not just centered in the space left over after the badge.
        <div className="mb-2 grid grid-cols-[1fr_auto_1fr] items-center">
          <div className="justify-self-start">
            <MatchStatusBadge status={status} />
          </div>
          <span className="justify-self-center text-lg font-extrabold text-ink">
            {pointsEarned !== null ? `${pointsEarned} נק'` : ""}
          </span>
          <span />
        </div>
      ) : (
        <div className={`mb-2 flex ${status === "live" ? "justify-center" : "justify-start"}`}>
          <MatchStatusBadge status={status} />
        </div>
      )}
      <div className="flex items-center gap-2">
        <div className={`flex flex-1 items-center gap-2.5 overflow-hidden rounded-lg border py-3 pe-3 text-sm ${teamClass(homeWins)}`}>
          <TeamColorBar team={homeTeam} />
          <span>{shortTeamName(homeTeam)}</span>
        </div>
        <ScoreBox value={home} onChange={onChangeHome} readOnly={readOnly} />
        <ScoreBox value={away} onChange={onChangeAway} readOnly={readOnly} />
        <div className={`flex flex-1 items-center justify-end gap-2.5 overflow-hidden rounded-lg border py-3 ps-3 text-end text-sm ${teamClass(awayWins)}`}>
          <span>{shortTeamName(awayTeam)}</span>
          <TeamColorBar team={awayTeam} />
        </div>
      </div>
      {hasFinalScore &&
        // The row above is a flex row that mirrors under the page's global
        // RTL — home_box is DOM-first so it lands visually *rightmost*,
        // away_box visually *leftmost*. This plain-text line doesn't
        // participate in that flex mirroring, so its number order has to
        // be set to match by hand: away score first (aligns under the
        // away box on the left), home score second (aligns under the home
        // box on the right) — not source/home-first, which would silently
        // mismatch the row's actual left-right layout.
        (isFinal ? (
          <p className="mt-2 rounded-md bg-black py-2 text-center text-base font-bold text-white">
            תוצאה סופית: {finalAwayScore}-{finalHomeScore}
          </p>
        ) : (
          <p className="mt-1 text-center text-xs text-muted">
            תוצאה נוכחית: {finalAwayScore}-{finalHomeScore}
          </p>
        ))}
    </div>
  );
}

function TeamColorBar({ team }: { team: string }) {
  const colors = TEAM_COLORS[team];
  if (!colors) return null;
  return (
    <span
      aria-hidden
      className="-my-3 w-3 shrink-0 self-stretch"
      style={{ background: `linear-gradient(to bottom, ${colors.primary} 50%, ${colors.secondary} 50%)` }}
    />
  );
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
