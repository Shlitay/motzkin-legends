import { createClient } from "@/lib/supabase/client";

type Supabase = ReturnType<typeof createClient>;

export type CurrentRound = {
  id: string;
  round_number: number;
  deadline_at: string;
  status: string;
};

// The season being played: the one with the latest start_date (same rule as
// current_season_id() in start-season-2.sql). Earlier seasons stay in the
// database but the app only shows the current one. Cached per page load.
let seasonPromise: Promise<string | null> | null = null;

export function getCurrentSeasonId(supabase: Supabase): Promise<string | null> {
  if (!seasonPromise) {
    seasonPromise = (async () => {
      const { data } = await supabase
        .from("seasons")
        .select("id")
        .order("start_date", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      return data?.id ?? null;
    })().catch(() => {
      seasonPromise = null;
      return null;
    });
  }
  return seasonPromise;
}

// The round everyone cares about right now: the current season's earliest
// round that isn't finished yet (a later round can already be seeded and
// open for predictions while an earlier one is still being played). Once
// every round is finished, the latest one. Deliberately not "status = open"
// — a round locks at its first kickoff, exactly when it's still the one
// that matters (production bug, 2026-08-23).
export async function getCurrentRound(supabase: Supabase): Promise<CurrentRound | null> {
  const seasonId = await getCurrentSeasonId(supabase);

  let query = supabase.from("rounds").select("id, round_number, deadline_at, status");
  if (seasonId) query = query.eq("season_id", seasonId);
  const { data } = await query.order("round_number", { ascending: true });

  const rounds = data ?? [];
  return rounds.find((r) => r.status !== "finished") ?? rounds[rounds.length - 1] ?? null;
}
