export type MatchStatus = "not-started" | "live" | "ended";

// A match's own is_final flag takes precedence over the clock — a manager
// can mark a match final immediately at the whistle, before kickoff_at's
// nominal 90+ minutes would otherwise have elapsed. Shared by
// /predictions (per-match badges) and /leaderboard (round-wide summary).
export function matchStatus(kickoffAt: string, isFinal: boolean, now: Date): MatchStatus {
  if (isFinal) return "ended";
  return now >= new Date(kickoffAt) ? "live" : "not-started";
}
