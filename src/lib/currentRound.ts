import { createClient } from "@/lib/supabase/client";

export type CurrentRound = {
  id: string;
  round_number: number;
  deadline_at: string;
  status: string;
};

// The latest round overall — deliberately not filtered to status =
// 'open'. A round locks at its own deadline_at (kickoff), which is
// exactly when it's still the one everyone cares about (results coming
// in, standings updating) — so scoping to 'open' makes every one of
// these lookups go blank the moment a round actually locks. Found via a
// real production bug on 2026-08-23 once round 1 genuinely locked.
export async function getCurrentRound(
  supabase: ReturnType<typeof createClient>
): Promise<CurrentRound | null> {
  const { data } = await supabase
    .from("rounds")
    .select("id, round_number, deadline_at, status")
    .order("round_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ?? null;
}
