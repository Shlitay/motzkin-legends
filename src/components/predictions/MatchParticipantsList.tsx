"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { deriveOutcome } from "@/lib/predictionOutcome";
import { OUTCOME_STYLES } from "./EndedMatchCard";

type StandingsEntry = { userId: string; name: string; avatar: string };

type PredictionRow = { user_id: string; pred_home_score: number; pred_away_score: number };

// Shown once a match is locked (its own day has started) — the mirror
// image of ParticipantModal's per-participant predictions list: instead
// of one participant's picks across every match, this is every
// participant's pick for this one match. Order matches the round's own
// current standings (round_participation.rank), passed down from
// /predictions so it's fetched once per round rather than once per match
// expanded.
export default function MatchParticipantsList({
  matchId,
  homeScore,
  awayScore,
  standingsOrder,
}: {
  matchId: string;
  homeScore: number | null;
  awayScore: number | null;
  standingsOrder: StandingsEntry[];
}) {
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState<Map<string, PredictionRow>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("predictions")
        .select("user_id, pred_home_score, pred_away_score")
        .eq("match_id", matchId);

      if (cancelled) return;
      setPredictions(new Map((data ?? []).map((p) => [p.user_id, p])));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, matchId]);

  const hasCurrentScore = homeScore !== null && awayScore !== null;

  return (
    <div className="mt-2 rounded-xl border border-neutral-200 bg-surface p-2">
      {loading ? (
        <p className="px-2 py-3 text-center text-xs text-muted">טוען...</p>
      ) : (
        <ul className="space-y-1">
          {standingsOrder.map((entry) => {
            const pred = predictions.get(entry.userId);
            const outcome =
              pred && hasCurrentScore
                ? deriveOutcome(pred.pred_home_score, pred.pred_away_score, homeScore, awayScore)
                : null;
            const style = outcome ? OUTCOME_STYLES[outcome] : null;

            return (
              <li
                key={entry.userId}
                className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm ${
                  style ? style.pointsBg : "bg-neutral-50"
                }`}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="shrink-0">{entry.avatar}</span>
                  <span className="truncate text-ink">{entry.name}</span>
                </span>
                <span
                  className={`shrink-0 font-display font-bold tabular-nums ${
                    style ? style.pointsText : "text-ink"
                  }`}
                  dir="ltr"
                  style={{ unicodeBidi: "isolate" }}
                >
                  {pred ? `${pred.pred_away_score}-${pred.pred_home_score}` : "-"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
