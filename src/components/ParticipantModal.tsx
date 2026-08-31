"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import StatCard from "@/components/StatCard";
import { ChevronIcon } from "@/components/icons";
import { TEAM_LOGOS, shortTeamName } from "@/lib/mock-data";

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

type RoundMatchPrediction = {
  id: string;
  home_team: string;
  away_team: string;
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

  // This participant's picks for every match in the current round, as a
  // plain list. Only meaningful once the round has started (locked) —
  // while it's still 'open' nobody but the predictor themselves can read
  // these rows anyway (rls.sql), and once the round is 'finished' this
  // quick "follow along live" view isn't the point anymore.
  const [roundMatches, setRoundMatches] = useState<RoundMatchPrediction[]>([]);
  const hasPredictions = round?.status === "locked" && roundMatches.length > 0;

  useEffect(() => {
    (async () => {
      if (!round || round.status !== "locked") {
        setRoundMatches([]);
        return;
      }

      const { data: matchRows } = await supabase
        .from("matches")
        .select("id, home_team, away_team, kickoff_at")
        .eq("round_id", round.id)
        .order("kickoff_at");

      const list = matchRows ?? [];
      if (list.length === 0) {
        setRoundMatches([]);
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
      setRoundMatches(
        list.map((m) => ({
          id: m.id,
          home_team: m.home_team,
          away_team: m.away_team,
          predHome: byMatch.get(m.id)?.pred_home_score ?? null,
          predAway: byMatch.get(m.id)?.pred_away_score ?? null,
        }))
      );
    })();
  }, [supabase, userId, round?.id, round?.status]);

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
            <PredictionsList name={season.display_name} matches={roundMatches} />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-3xl">
                {season.avatar ?? "🙂"}
              </div>
              <p className="font-medium text-ink">{season.display_name}</p>
            </div>

            {hasPredictions && (
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

// One line per match: home team, this participant's predicted score, away
// team — the whole current round at a glance, no per-match navigation.
function PredictionsList({ name, matches }: { name: string; matches: RoundMatchPrediction[] }) {
  return (
    <div className="w-full">
      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        ניחושי {name} למחזור הנוכחי
      </p>

      <ul className="space-y-2">
        {matches.map((m) => (
          <li
            key={m.id}
            className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-surface px-3 py-2 text-sm"
          >
            <span className="flex flex-1 items-center gap-1.5 text-ink">
              <TeamLogo team={m.home_team} />
              {shortTeamName(m.home_team)}
            </span>
            {/* A single self-contained "1-2" chip, not two digits stacked
                under separate team boxes like elsewhere in this app — so
                the away-first alignment trick those cases need doesn't
                apply here. Isolated to ltr just to keep the digit-dash-digit
                run stable next to the Hebrew team names on either side,
                same bidi precaution as everywhere else in this codebase. */}
            <span
              className="shrink-0 font-display font-bold tabular-nums text-ink"
              dir="ltr"
              style={{ unicodeBidi: "isolate" }}
            >
              {m.predHome ?? "-"}-{m.predAway ?? "-"}
            </span>
            <span className="flex flex-1 items-center justify-end gap-1.5 text-end text-ink">
              {shortTeamName(m.away_team)}
              <TeamLogo team={m.away_team} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TeamLogo({ team }: { team: string }) {
  const src = TEAM_LOGOS[team];
  if (!src) return null;
  return <img src={src} alt="" className="h-6 w-6 shrink-0 object-contain" />;
}
