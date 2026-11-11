"use client";

import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import { createClient } from "@/lib/supabase/client";
import { CHIP_LABEL, computePoints, outcomeKind, type OutcomeKind, type ScoringRules } from "@/lib/scoring";

export type StandingsEntry = { userId: string; name: string; avatar: string | null };

type PredictionRow = { user_id: string; pred_home_score: number; pred_away_score: number };

const CHIP: Record<OutcomeKind, string> = {
  exact: "bg-gold-light text-[#5C4400]",
  dirDiff: "bg-green-50 text-[#14512D]",
  drawDir: "bg-green-50 text-[#14512D]",
  dir: "bg-green-50 text-[#14512D]",
  miss: "bg-[#ECECE6] text-[#3F4440]",
};

const POINTS_COLOR: Record<OutcomeKind, string> = {
  exact: "text-[#6E5200]",
  dirDiff: "text-[#14512D]",
  drawDir: "text-[#14512D]",
  dir: "text-[#14512D]",
  miss: "text-[#6B6F68]",
};

// Drawer inside a started match's card (design/boards/Participants.dc.html):
// everyone's pick for this match, ordered by round rank, with a 3-segment
// exact / towards / miss summary bar. RLS only returns other players'
// predictions once the match's day has locked.
export default function MatchParticipantsList({
  matchId,
  homeScore,
  awayScore,
  final,
  rules,
  standingsOrder,
  currentUserId,
}: {
  matchId: string;
  homeScore: number | null;
  awayScore: number | null;
  final: boolean;
  rules: ScoringRules;
  standingsOrder: StandingsEntry[];
  currentUserId: string | null;
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

  const hasScore = homeScore !== null && awayScore !== null;

  const rows = standingsOrder
    .map((entry, i) => {
      const pred = predictions.get(entry.userId);
      if (!pred) return null;
      const kind = hasScore ? outcomeKind(pred.pred_home_score, pred.pred_away_score, homeScore, awayScore) : null;
      const points = hasScore ? computePoints(pred.pred_home_score, pred.pred_away_score, homeScore, awayScore, rules) : null;
      return { entry, rank: i + 1, pred, kind, points, me: entry.userId === currentUserId };
    })
    .filter((r) => r !== null);

  const ex = rows.filter((r) => r.kind === "exact").length;
  const ms = rows.filter((r) => r.kind === "miss").length;
  const dr = rows.filter((r) => r.kind !== null && r.kind !== "exact" && r.kind !== "miss").length;

  return (
    <div className="flex flex-col gap-2.5 border-t border-[#ECECE6] bg-[#FCFCFA] px-3 pb-2 pt-3">
      {loading ? (
        <p className="py-2 text-center text-xs text-muted">טוען...</p>
      ) : rows.length === 0 ? (
        <p className="py-2 text-center text-xs text-muted">עוד אין ניחושים להצגה.</p>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs font-bold text-[#3F4B43]">
            <span>
              {rows.length} ניחושים · {final ? "סופי" : "נכון לעכשיו"}
            </span>
            <span className="font-semibold text-muted">{final ? "נקודות" : "נקודות כרגע"}</span>
          </div>

          {hasScore && (
            <>
              <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
                {ex > 0 && <span className="bg-gold" style={{ flex: ex }} />}
                {dr > 0 && <span className="bg-pitch-600" style={{ flex: dr }} />}
                {ms > 0 && <span className="bg-miss" style={{ flex: ms }} />}
              </div>
              <div className="flex gap-3 text-[11px] font-bold">
                <span className="inline-flex items-center gap-[5px] text-[#5C4400]">
                  <span className="bg-gold h-2 w-2 rounded-sm" />
                  {ex} בול
                </span>
                <span className="inline-flex items-center gap-[5px] text-[#14512D]">
                  <span className="h-2 w-2 rounded-sm bg-pitch-600" />
                  {dr} בכיוון
                </span>
                <span className="inline-flex items-center gap-[5px] text-[#3F4440]">
                  <span className="h-2 w-2 rounded-sm bg-miss" />
                  {ms} פספוס
                </span>
              </div>
            </>
          )}

          <ul className="flex flex-col">
            {rows.map((r) => (
              <li
                key={r.entry.userId}
                className={
                  "grid min-h-9 grid-cols-[18px_26px_minmax(0,1fr)_40px_86px_26px] items-center gap-1.5 rounded-[10px] px-1.5 " +
                  (r.me ? "bg-cream" : "")
                }
              >
                <span className="text-center font-display text-xs font-semibold text-[#8E918A]">{r.rank}</span>
                <Avatar avatar={r.entry.avatar} size={26} />
                <span className={"truncate text-[13px] " + (r.me ? "font-extrabold" : "font-semibold")}>
                  {r.entry.name}
                  {r.me && " (אתה)"}
                </span>
                <span className="inline-flex justify-center gap-[3px] font-display text-[13px] font-semibold">
                  <span>{r.pred.pred_home_score}</span>
                  <span>:</span>
                  <span>{r.pred.pred_away_score}</span>
                </span>
                {r.kind ? (
                  <span className={"whitespace-nowrap rounded-full px-2 py-0.5 text-center text-[11px] font-extrabold " + CHIP[r.kind]}>
                    {CHIP_LABEL[r.kind]}
                  </span>
                ) : (
                  <span />
                )}
                <span
                  dir="ltr"
                  className={"text-left font-display text-sm font-bold " + (r.kind ? POINTS_COLOR[r.kind] : "text-muted")}
                >
                  {r.points === null ? "" : r.points > 0 ? `+${r.points}` : "0"}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
