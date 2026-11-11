"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";
import { TEAM_LOGOS, shortTeamName } from "@/lib/constants";
import { outcomeKind } from "@/lib/scoring";

// Identity + season totals, from season_stats.
type SeasonRow = {
  display_name: string;
  avatar: string | null;
  total_points: number;
  rounds_played: number;
  season_hits: number;
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
  homeScore: number | null;
  awayScore: number | null;
  pointsEarned: number | null;
};

// Player details bottom sheet (opened from the leaderboard): identity,
// season totals, the round's stats, and this player's picks for the round.
export default function ParticipantModal({
  userId,
  round,
  onClose,
}: {
  userId: string;
  // round_number is needed too, to exclude it (and anything after it) from
  // "last round" candidates below.
  round: { id: string; status: string; round_number: number } | null;
  onClose: () => void;
}) {
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [season, setSeason] = useState<SeasonRow | null>(null);
  const [lastRound, setLastRound] = useState<LastRoundRow | null>(null);

  // This player's picks for every match of the round the sheet is viewed in
  // context of. Only once that round has started — before, nobody but the
  // predictor can read them (rls.sql). Which days are readable is RLS's
  // call, per match day; a hidden day just comes back as "–".
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
        .select("id, home_team, away_team, kickoff_at, is_main_event, home_score, away_score")
        .eq("round_id", round.id)
        .order("kickoff_at");

      const list = matchRows ?? [];
      if (list.length === 0) {
        setRoundMatches([]);
        return;
      }

      // Readable thanks to predictions_select_locked_round (fix-predictions-
      // locked-round-approved-only.sql) — the *viewer* is approved for this
      // round, whoever's predictions these are.
      const { data: predRows } = await supabase
        .from("predictions")
        .select("match_id, pred_home_score, pred_away_score, points_earned")
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
          homeScore: m.home_score,
          awayScore: m.away_score,
          pointsEarned: byMatch.get(m.id)?.points_earned ?? null,
        }))
      );
    })();
  }, [supabase, userId, round?.id, round?.status]);

  useEffect(() => {
    (async () => {
      const { data: seasonRow } = await supabase
        .from("season_stats")
        .select("display_name, avatar, total_points, rounds_played, season_hits")
        .eq("user_id", userId)
        .single();
      setSeason(seasonRow ?? null);

      // Which round's stats to show: while the viewed round is still 'open'
      // (not started), the most recent round this player played *before*
      // it — a just-opened round may already have a near-empty row. Once
      // the viewed round has started, that round itself (live stats).
      //
      // Sorted client-side: .order(..., { foreignTable }) only reorders rows
      // nested inside an embed, not the outer query.
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
      setLastRound(participation ? { ...participation, round_number: participation.rounds?.round_number ?? null } : null);

      setLoading(false);
    })();
  }, [supabase, userId, round?.round_number]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const lastRoundIsSelected =
    !!lastRound?.round_number && round != null && lastRound.round_number === round.round_number && round.status !== "open";
  const lastRoundTitle = !lastRound?.round_number
    ? "מחזור אחרון"
    : lastRoundIsSelected
      ? round?.status === "locked"
        ? `מחזור ${lastRound.round_number} · חי`
        : `מחזור ${lastRound.round_number}`
      : `מחזור קודם · ${lastRound.round_number}`;

  const stats = [
    { n: lastRound?.rank ?? "–", l: "מקום", gold: true },
    { n: lastRound?.total_points ?? 0, l: "נקודות" },
    { n: lastRound?.exact_score_count ?? 0, l: "בולים", crown: true },
    { n: lastRound?.correct_result_count ?? 0, l: "בכיוון", green: true },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(11,42,23,.55)]" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={season ? `הפרטים של ${season.display_name}` : "פרטי משתתף"}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-md flex-col gap-3.5 overflow-y-auto rounded-t-[26px] bg-chalk px-4 pb-5 pt-2.5 shadow-[0_-10px_30px_rgba(0,0,0,.25)]"
      >
        <div className="flex justify-center">
          <span className="h-[5px] w-10 rounded-full bg-miss" />
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-muted">טוען...</p>
        ) : !season ? (
          <p className="py-10 text-center text-sm text-danger">לא ניתן היה לטעון את המשתתף.</p>
        ) : (
          <>
            {/* identity */}
            <div className="relative flex items-center gap-3.5">
              <span className="border-gold flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-full [--gold-border:3px]">
                <Avatar avatar={season.avatar} size={66} />
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-[21px] font-black">{season.display_name}</span>
                <span className="text-[13px] text-muted">
                  העונה: <b className="font-display text-ink">{season.total_points}</b> נק׳ · {season.rounds_played} מחזורים ·{" "}
                  {season.season_hits} בולים
                </span>
              </div>
              <button
                type="button"
                aria-label="סגירה"
                onClick={onClose}
                className="absolute -top-1 left-0 flex h-10 w-10 items-center justify-center rounded-full bg-[#ECECE6]"
              >
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#17231C" strokeWidth="2.6" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            {/* round stats */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-extrabold text-muted">{lastRoundTitle}</span>
              <div className="flex gap-2">
                {stats.map((s) => (
                  <div
                    key={s.l}
                    className={
                      "flex flex-1 flex-col items-center gap-0.5 rounded-[14px] px-1 py-2.5 " +
                      (s.gold ? "border-gold" : "border border-line bg-white")
                    }
                  >
                    <span
                      className={
                        "inline-flex items-center gap-[3px] font-display text-2xl font-bold leading-none " +
                        (s.green ? "text-pitch-600" : "")
                      }
                    >
                      {s.crown && (
                        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="#C9A227">
                          <path d="M3 9l4.6 3.6L12 5.5l4.4 7.1L21 9l-1.8 9H4.8z" />
                          <rect x="4.8" y="19.2" width="14.4" height="2" rx="1" />
                        </svg>
                      )}
                      {s.n}
                    </span>
                    <span className="text-[11px] font-bold text-muted">{s.l}</span>
                  </div>
                ))}
              </div>
            </div>

            {roundStarted && roundMatches.length > 0 && (
              <PredictionsList name={season.display_name} roundNumber={round.round_number} matches={roundMatches} />
            )}
          </>
        )}
      </section>
    </div>
  );
}

// One row per match: crests, this player's pick (flex row, so under RTL the
// home digit sits on the right next to the home team, like the match
// cards), an outcome chip once there's a score, and points earned.
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
    <div className="flex flex-col gap-2">
      <span className="text-xs font-extrabold text-muted">
        הניחושים של {name} · מחזור {roundNumber}
      </span>
      <ul className="overflow-hidden rounded-2xl border border-line bg-white">
        {matches.map((m) => {
          const hasPred = m.predHome !== null && m.predAway !== null;
          const kind =
            hasPred && m.homeScore !== null && m.awayScore !== null
              ? outcomeKind(m.predHome!, m.predAway!, m.homeScore, m.awayScore)
              : null;
          const chip =
            kind === null
              ? null
              : kind === "exact"
              ? { label: "בול", cls: "bg-gold-light text-[#5C4400]" }
              : kind === "miss"
              ? { label: "פספוס", cls: "bg-[#ECECE6] text-[#3F4440]" }
              : { label: "בכיוון", cls: "bg-green-50 text-[#14512D]" };
          return (
            <li
              key={m.id}
              className={
                "grid min-h-12 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_68px] items-center gap-1.5 border-b border-[#F0F0EA] px-2.5 last:border-b-0 " +
                (m.isMainEvent ? "bg-[#FFFCF2]" : "")
              }
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <TeamLogo team={m.home_team} />
                <span className="truncate text-[13px] font-bold">{shortTeamName(m.home_team)}</span>
              </span>
              <span
                className={
                  "inline-flex items-center gap-1 rounded-md px-2 py-px font-display text-[15px] font-semibold " +
                  (kind === "exact" ? "bg-gold text-gold-ink" : "bg-[#F1F1EC] text-ink")
                }
              >
                <span>{m.predHome ?? "–"}</span>
                <span>:</span>
                <span>{m.predAway ?? "–"}</span>
              </span>
              <span className="flex min-w-0 items-center justify-end gap-1.5">
                <span className="truncate text-[13px] font-bold">{shortTeamName(m.away_team)}</span>
                <TeamLogo team={m.away_team} />
              </span>
              <span className="flex items-center justify-end gap-1">
                {chip && (
                  <span className={"whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-extrabold " + chip.cls}>
                    {chip.label}
                  </span>
                )}
                {m.pointsEarned !== null && m.pointsEarned > 0 && (
                  <span dir="ltr" className="font-display text-xs font-bold text-[#14512D]">
                    +{m.pointsEarned}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TeamLogo({ team }: { team: string }) {
  const src = TEAM_LOGOS[team];
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className="h-6 w-6 shrink-0 object-contain" />;
}
