"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentRound } from "@/lib/currentRound";

type DbMatch = {
  id: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
};

type RowState = {
  home: string;
  away: string;
  saving: boolean;
  saved: boolean;
  error: string | null;
};

export default function MatchResultsModal({ onClose }: { onClose: () => void }) {
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [roundNumber, setRoundNumber] = useState<number | null>(null);
  const [matches, setMatches] = useState<DbMatch[]>([]);
  const [rows, setRows] = useState<Record<string, RowState>>({});

  useEffect(() => {
    (async () => {
      const round = await getCurrentRound(supabase);

      if (!round) {
        setLoadError("לא נמצא אף מחזור.");
        setLoading(false);
        return;
      }

      setRoundNumber(round.round_number);

      const { data: matchRows, error: matchesError } = await supabase
        .from("matches")
        .select("id, home_team, away_team, home_score, away_score")
        .eq("round_id", round.id)
        .order("kickoff_at");

      if (matchesError) {
        setLoadError(matchesError.message);
        setLoading(false);
        return;
      }

      const list = matchRows ?? [];
      setMatches(list);
      setRows(
        Object.fromEntries(
          list.map((m) => [
            m.id,
            {
              home: m.home_score === null ? "" : String(m.home_score),
              away: m.away_score === null ? "" : String(m.away_score),
              saving: false,
              saved: false,
              error: null,
            },
          ])
        )
      );
      setLoading(false);
    })();
  }, [supabase]);

  function setScore(matchId: string, side: "home" | "away", value: string) {
    if (value !== "" && !/^\d$/.test(value)) return;
    setRows((prev) => ({
      ...prev,
      [matchId]: { ...prev[matchId], [side]: value, saved: false },
    }));
  }

  async function saveRow(matchId: string) {
    const row = rows[matchId];
    if (!row || row.home === "" || row.away === "") return;

    setRows((prev) => ({ ...prev, [matchId]: { ...prev[matchId], saving: true, error: null } }));

    const { error } = await supabase.rpc("submit_match_result", {
      p_match_id: matchId,
      p_home_score: Number(row.home),
      p_away_score: Number(row.away),
    });

    setRows((prev) => ({
      ...prev,
      [matchId]: { ...prev[matchId], saving: false, saved: !error, error: error?.message ?? null },
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 text-center shadow-lg">
        <h2 className="mb-1 text-xl font-semibold">
          {roundNumber ? `תוצאות מחזור ${roundNumber}` : "תוצאות מחזור"}
        </h2>
        <p className="mb-5 text-xs text-muted">
          כל שמירה מעדכנת מיד את הניקוד והדירוג של כל המשתתפים.
        </p>

        {loading ? (
          <p className="text-sm text-muted">טוען...</p>
        ) : loadError ? (
          <p className="text-sm text-danger">{loadError}</p>
        ) : (
          <div className="space-y-3 text-start">
            {matches.map((m) => {
              const row = rows[m.id];
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2.5"
                >
                  <span className="flex-1 truncate text-sm">{m.home_team}</span>
                  <input
                    value={row?.home ?? ""}
                    onChange={(e) => setScore(m.id, "home", e.target.value)}
                    inputMode="numeric"
                    maxLength={1}
                    className="h-9 w-9 shrink-0 rounded border border-neutral-300 text-center text-sm"
                  />
                  <span className="shrink-0 text-muted">-</span>
                  <input
                    value={row?.away ?? ""}
                    onChange={(e) => setScore(m.id, "away", e.target.value)}
                    inputMode="numeric"
                    maxLength={1}
                    className="h-9 w-9 shrink-0 rounded border border-neutral-300 text-center text-sm"
                  />
                  <span className="flex-1 truncate text-end text-sm">{m.away_team}</span>
                  <button
                    onClick={() => saveRow(m.id)}
                    disabled={!row || row.home === "" || row.away === "" || row.saving}
                    className="shrink-0 rounded-full bg-brand px-3 py-1.5 text-xs font-medium text-white enabled:hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-neutral-300"
                  >
                    {row?.saving ? "שומר..." : row?.saved ? "נשמר ✓" : "שמירה"}
                  </button>
                </div>
              );
            })}
            {Object.values(rows).some((r) => r.error) && (
              <p className="text-xs text-danger">
                {Object.values(rows).find((r) => r.error)?.error}
              </p>
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
