"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import StatCard from "@/components/StatCard";

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

export default function ParticipantModal({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [season, setSeason] = useState<SeasonRow | null>(null);
  const [lastRound, setLastRound] = useState<LastRoundRow | null>(null);

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
      const { data: participation } = await supabase
        .from("round_participation")
        .select("rank, total_points, exact_score_count, correct_result_count, rounds(round_number)")
        .eq("user_id", userId)
        .order("round_number", { foreignTable: "rounds", ascending: false })
        .limit(1)
        .maybeSingle();
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
        ) : (
          <div className="flex flex-col items-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-3xl">
                {season.avatar ?? "🙂"}
              </div>
              <p className="font-medium text-ink">{season.display_name}</p>
            </div>

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
