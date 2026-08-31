"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import StatCard from "@/components/StatCard";
import { ChevronIcon } from "@/components/icons";
import { TEAM_LOGOS, shortTeamName } from "@/lib/mock-data";
import { matchStatus } from "@/lib/matchStatus";

type SeasonRow = {
  display_name: string;
  avatar: string | null;
  rounds_played: number;
  total_points: number;
  season_hits: number;
  season_towards: number;
};

type LastRoundRow = {
  rank: number | null;
  total_points: number | null;
  exact_score_count: number | null;
  correct_result_count: number | null;
};

type SlideMatch = {
  id: string;
  home_team: string;
  away_team: string;
  kickoff_at: string;
  home_score: number | null;
  away_score: number | null;
  is_final: boolean;
  predHome: number | null;
  predAway: number | null;
};

export default function ParticipantModal({
  userId,
  round,
  onClose,
}: {
  userId: string;
  // Only the round's id/status matter here — kept loose so callers can
  // pass their own CurrentRound (or RoundMatch-shaped object) as-is.
  round: { id: string; status: string } | null;
  onClose: () => void;
}) {
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [season, setSeason] = useState<SeasonRow | null>(null);
  const [lastRound, setLastRound] = useState<LastRoundRow | null>(null);

  // The stats popup and the predictions popup are two separate screens of
  // the same modal — "predictions" fully replaces the stats content
  // rather than showing alongside it.
  const [view, setView] = useState<"stats" | "predictions">("stats");

  // Slide-through view of this participant's current-round predictions.
  // Only meaningful once the round has started (locked) — while it's
  // still 'open' nobody but the predictor themselves can read these rows
  // anyway (rls.sql), and once the round is 'finished' this quick "follow
  // along live" view isn't the point anymore.
  const [slideMatches, setSlideMatches] = useState<SlideMatch[]>([]);
  const [slideIndex, setSlideIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const showSlides = round?.status === "locked" && slideMatches.length > 0;

  useEffect(() => {
    (async () => {
      if (!round || round.status !== "locked") {
        setSlideMatches([]);
        return;
      }

      const { data: matchRows } = await supabase
        .from("matches")
        .select("id, home_team, away_team, kickoff_at, home_score, away_score, is_final")
        .eq("round_id", round.id)
        .order("kickoff_at");

      const list = matchRows ?? [];
      if (list.length === 0) {
        setSlideMatches([]);
        return;
      }

      // Relies on predictions_select_locked_round (see
      // fix-predictions-locked-round-approved-only.sql) — readable here
      // only because the *viewer* is themselves an approved participant
      // of this round, regardless of whose predictions these are.
      const { data: predRows } = await supabase
        .from("predictions")
        .select("match_id, pred_home_score, pred_away_score")
        .eq("user_id", userId)
        .in("match_id", list.map((m) => m.id));

      const byMatch = new Map((predRows ?? []).map((p) => [p.match_id, p]));
      setSlideMatches(
        list.map((m) => ({
          ...m,
          predHome: byMatch.get(m.id)?.pred_home_score ?? null,
          predAway: byMatch.get(m.id)?.pred_away_score ?? null,
        }))
      );
      setSlideIndex(0);
    })();
  }, [supabase, userId, round?.id, round?.status]);

  function goNext() {
    setSlideIndex((i) => Math.min(i + 1, slideMatches.length - 1));
  }
  function goPrevious() {
    setSlideIndex((i) => Math.max(i - 1, 0));
  }
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    // Mirrors the prev/next chevron layout below (previous = screen-right,
    // next = screen-left, same as the round switcher on /predictions) —
    // a right-to-left drag (delta negative) reads as "forward".
    if (delta < -40) goNext();
    else if (delta > 40) goPrevious();
  }

  useEffect(() => {
    (async () => {
      const { data: seasonRow } = await supabase
        .from("season_stats")
        .select("display_name, avatar, rounds_played, total_points, season_hits, season_towards")
        .eq("user_id", userId)
        .single();
      setSeason(seasonRow ?? null);

      // "Last round" = the round this user most recently actually
      // participated in — not the newest round overall, which may be
      // one they haven't played yet. Round status never transitions to
      // 'finished' in the SQL, so status can't be used to find it either.
      //
      // Sorted client-side, not via .order(..., { foreignTable }) — that
      // option only reorders rows *nested inside* an embed, it does NOT
      // reorder the outer query by a related table's column (confirmed
      // against postgrest-js's own source/docs). The previous version of
      // this query silently returned rows in unspecified order.
      const { data: allParticipation } = await supabase
        .from("round_participation")
        .select("rank, total_points, exact_score_count, correct_result_count, rounds(round_number)")
        .eq("user_id", userId)
        .overrideTypes<
          {
            rank: number | null;
            total_points: number | null;
            exact_score_count: number | null;
            correct_result_count: number | null;
            rounds: { round_number: number } | null;
          }[],
          { merge: false }
        >();

      const participation = (allParticipation ?? []).sort(
        (a, b) => (b.rounds?.round_number ?? -1) - (a.rounds?.round_number ?? -1)
      )[0];
      setLastRound(participation ?? null);

      setLoading(false);
    })();
  }, [supabase, userId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg">
        {loading ? (
          <p className="text-sm text-muted">טוען...</p>
        ) : !season ? (
          <p className="text-sm text-danger">לא ניתן היה לטעון את המשתתף.</p>
        ) : view === "predictions" ? (
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={() => setView("stats")}
              className="flex items-center gap-1 self-start text-sm font-medium text-muted hover:text-ink"
            >
              <ChevronIcon size={14} className="rotate-180" />
              חזרה
            </button>
            <PredictionSlides
              name={season.display_name}
              matches={slideMatches}
              index={slideIndex}
              onNext={goNext}
              onPrevious={goPrevious}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-3xl">
                {season.avatar ?? "🙂"}
              </div>
              <p className="font-medium text-ink">{season.display_name}</p>
            </div>

            {showSlides && (
              <button
                onClick={() => setView("predictions")}
                className="flex items-center gap-1 text-sm font-medium text-brand hover:underline"
              >
                צפייה בניחושי המשתתף
                <ChevronIcon size={14} />
              </button>
            )}

            <StatCard
              title="מחזור אחרון"
              headline={`מקום: ${lastRound?.rank ?? 0}`}
              towards={lastRound?.correct_result_count ?? 0}
              points={lastRound?.total_points ?? 0}
              hit={lastRound?.exact_score_count ?? 0}
            />

            <StatCard
              title="כל העונה"
              headline={`סה"כ השתתפויות: ${season.rounds_played}`}
              towards={season.season_towards}
              points={season.total_points}
              hit={season.season_hits}
            />
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-6 rounded-full border border-neutral-300 px-6 py-2 font-medium hover:bg-neutral-50"
        >
          סגירה
        </button>
      </div>
    </div>
  );
}

// Bare-bones slide-through view, one match per slide — chevrons follow the
// same left/right convention as the round switcher on /predictions
// (previous = rotated chevron on screen-right, next = plain chevron on
// screen-left), plus basic touch-swipe for an actual "slide" feel.
function PredictionSlides({
  name,
  matches,
  index,
  onNext,
  onPrevious,
  onTouchStart,
  onTouchEnd,
}: {
  name: string;
  matches: SlideMatch[];
  index: number;
  onNext: () => void;
  onPrevious: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}) {
  const m = matches[index];
  const now = new Date();
  const status = matchStatus(m.kickoff_at, m.is_final, now);
  const hasResult = status !== "not-started" && m.home_score !== null && m.away_score !== null;

  return (
    <div className="w-full">
      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        ניחושי {name} למחזור הנוכחי
      </p>

      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="rounded-xl border border-neutral-200 bg-surface p-4"
      >
        <div className="flex items-center justify-center gap-3">
          <div className="flex flex-1 flex-col items-center gap-1.5">
            <TeamLogo team={m.home_team} />
            <span className="text-xs font-medium text-ink">{shortTeamName(m.home_team)}</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            {/* Home box is DOM-first so it renders visually *right* under
                this row's RTL mirroring, away box visually *left* (same
                pattern as MatchRow/EndedMatchCard elsewhere in this app) —
                a dir="ltr" span always reads left-to-right regardless, so
                away has to come first here to land under the away box on
                the left, home second to land under home on the right. */}
            <span className="font-display text-lg font-bold tabular-nums text-ink" dir="ltr">
              {m.predAway ?? "-"} : {m.predHome ?? "-"}
            </span>
            <span className="text-[10px] font-medium text-muted">ניחוש</span>
            {hasResult && (
              <span className="mt-1 text-xs font-medium tabular-nums text-muted" dir="ltr">
                {m.away_score} : {m.home_score}
              </span>
            )}
          </div>

          <div className="flex flex-1 flex-col items-center gap-1.5">
            <TeamLogo team={m.away_team} />
            <span className="text-xs font-medium text-ink">{shortTeamName(m.away_team)}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-4">
        <button
          onClick={onPrevious}
          disabled={index === 0}
          aria-label="משחק קודם"
          className="text-muted enabled:hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronIcon size={16} className="rotate-180" />
        </button>
        <span className="text-xs text-muted">
          משחק {index + 1} מתוך {matches.length}
        </span>
        <button
          onClick={onNext}
          disabled={index === matches.length - 1}
          aria-label="משחק הבא"
          className="text-muted enabled:hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronIcon size={16} />
        </button>
      </div>
    </div>
  );
}

function TeamLogo({ team }: { team: string }) {
  const src = TEAM_LOGOS[team];
  if (!src) return null;
  return <img src={src} alt="" className="h-7 w-7 object-contain" />;
}
