"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import StatCard from "@/components/StatCard";
import { TEAM_LOGOS, shortTeamName } from "@/lib/constants";

// Only the identity fields — the modal no longer shows season totals, but
// season_stats is still where a participant's display name/avatar come from.
type SeasonRow = {
  display_name: string;
  avatar: string | null;
};

type LastRoundRow = {
  rank: number | null;
  total_points: number | null;
  exact_score_count: number | null;
  correct_result_count: number | null;
  round_number: number | null;
};

type RoundMatchPrediction = {
  id: string;
  home_team: string;
  away_team: string;
  predHome: number | null;
  predAway: number | null;
  isMainEvent: boolean;
};

export default function ParticipantModal({
  userId,
  round,
  onClose,
}: {
  userId: string;
  // round_number is needed too, to exclude it (and anything after it) from
  // "last round" candidates below — kept loose otherwise so callers can
  // pass their own CurrentRound (or RoundMatch-shaped object) as-is.
  round: { id: string; status: string; round_number: number } | null;
  onClose: () => void;
}) {
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [season, setSeason] = useState<SeasonRow | null>(null);
  const [lastRound, setLastRound] = useState<LastRoundRow | null>(null);

  // This participant's picks for every match in the round the modal is
  // viewed in context of, shown inline under the stats. Only meaningful
  // once the round has started (locked or finished) — while it's still
  // 'open' nobody but the predictor themselves can read these rows anyway
  // (rls.sql). Which days are actually readable is RLS's call, per match
  // day, not this component's — a hidden day just comes back as "-".
  const [roundMatches, setRoundMatches] = useState<RoundMatchPrediction[]>([]);
  const roundStarted = !!round && round.status !== "open";

  useEffect(() => {
    (async () => {
      if (!round || round.status === "open") {
        setRoundMatches([]);
        return;
      }

      const { data: matchRows } = await supabase
        .from("matches")
        .select("id, home_team, away_team, kickoff_at, is_main_event")
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
          isMainEvent: m.is_main_event,
        }))
      );
    })();
  }, [supabase, userId, round?.id, round?.status]);

  useEffect(() => {
    (async () => {
      const { data: seasonRow } = await supabase
        .from("season_stats")
        .select("display_name, avatar")
        .eq("user_id", userId)
        .single();
      setSeason(seasonRow ?? null);

      // "Last round" card: while the round this modal is viewed in context
      // of (the `round` prop — the leaderboard's own selected round,
      // defaulting to whichever is 'open') is still 'open' (not started),
      // show the most recent round the user actually played *before* it —
      // `round` itself may already have a real round_participation row
      // despite having barely started (predictions open immediately and
      // submitting one auto-creates that row — see /predictions'
      // sendPrediction()), so a no-filter highest-round pick would show
      // that near-empty round instead of the previous, fully-played one.
      // But once `round` has actually started (status 'locked'/
      // 'finished'), it IS the relevant round to show — live in-progress
      // stats for the round underway, not the prior finished one.
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

      const participation = (allParticipation ?? [])
        .filter((p) => {
          if (round == null) return true;
          const roundNumber = p.rounds?.round_number ?? Infinity;
          return round.status === "open" ? roundNumber < round.round_number : roundNumber <= round.round_number;
        })
        .sort((a, b) => (b.rounds?.round_number ?? -1) - (a.rounds?.round_number ?? -1))[0];
      setLastRound(
        participation
          ? { ...participation, round_number: participation.rounds?.round_number ?? null }
          : null
      );

      setLoading(false);
    })();
  }, [supabase, userId, round?.round_number]);

  // The shown round IS the round this modal is viewed in context of once
  // that round has started — "live" while it's still locked (matches
  // underway), plain "מחזור N" once finished. A fallback to an earlier
  // round (this round not started yet, or this user has no row for it) is
  // always "previous".
  const lastRoundIsSelected =
    !!lastRound?.round_number &&
    round != null &&
    lastRound.round_number === round.round_number &&
    round.status !== "open";
  const lastRoundTitle = !lastRound?.round_number
    ? "מחזור אחרון"
    : lastRoundIsSelected
      ? round?.status === "locked"
        ? `מחזור חי נוכחי (מחזור ${lastRound.round_number})`
        : `מחזור ${lastRound.round_number}`
      : `מחזור קודם (מחזור ${lastRound.round_number})`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white px-8 pb-8 pt-5 text-center shadow-lg">
        {loading ? (
          <p className="text-sm text-muted">טוען...</p>
        ) : !season ? (
          <p className="text-sm text-danger">לא ניתן היה לטעון את המשתתף.</p>
        ) : (
          <div className="flex flex-col items-center gap-6">
            <div className="-mb-2 flex flex-col items-center gap-2">
              <div className="flex h-[51px] w-[51px] items-center justify-center rounded-full bg-neutral-100 text-2xl">
                {season.avatar ?? "🙂"}
              </div>
              <p className="font-medium text-ink">{season.display_name}</p>
            </div>

            <StatCard
              title={lastRoundTitle}
              headline={`מקום: ${lastRound?.rank ?? 0}`}
              towards={lastRound?.correct_result_count ?? 0}
              points={lastRound?.total_points ?? 0}
              hit={lastRound?.exact_score_count ?? 0}
            />

            {roundStarted && roundMatches.length > 0 && (
              <PredictionsList
                name={season.display_name}
                roundNumber={round.round_number}
                matches={roundMatches}
              />
            )}
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
function PredictionsList({
  name,
  roundNumber,
  matches,
}: {
  name: string;
  roundNumber: number;
  matches: RoundMatchPrediction[];
}) {
  return (
    <div className="w-full">
      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        ניחושי {name} — מחזור {roundNumber}
      </p>

      <ul className="space-y-2">
        {matches.map((m) => (
          <li
            key={m.id}
            className={`flex items-center gap-2 rounded-lg border bg-surface px-3 py-2 text-sm ${
              m.isMainEvent ? "border-[#d4a017] bg-[#d4a017]/5" : "border-neutral-200"
            }`}
          >
            <span className="flex flex-1 items-center gap-1.5 text-ink">
              <TeamLogo team={m.home_team} />
              {shortTeamName(m.home_team)}
            </span>
            {/* Home box is DOM-first so it renders visually *right* under
                this row's RTL mirroring, away box visually *left* (same
                pattern as MatchRow/EndedMatchCard elsewhere in this app).
                A dir="ltr" span always reads left-to-right regardless of
                being one atomic chip rather than two stacked digits — a
                reader still associates the leftmost digit with whichever
                box sits on the left, so away has to come first here too,
                home second, same fix already needed twice elsewhere in
                this codebase for the identical reason. */}
            <span
              className="shrink-0 font-display font-bold tabular-nums text-ink"
              dir="ltr"
              style={{ unicodeBidi: "isolate" }}
            >
              {m.predAway ?? "-"}-{m.predHome ?? "-"}
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
