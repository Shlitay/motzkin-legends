export type MatchStatus = "not-started" | "live" | "ended";

// A match's own is_final flag takes precedence over the clock — a manager
// can mark a match final immediately at the whistle, before kickoff_at's
// nominal 90+ minutes would otherwise have elapsed. Shared by
// /predictions (per-match badges) and /leaderboard (round-wide summary).
export function matchStatus(kickoffAt: string, isFinal: boolean, now: Date): MatchStatus {
  if (isFinal) return "ended";
  return now >= new Date(kickoffAt) ? "live" : "not-started";
}

export type LiveClock = {
  live_status: string | null;
  live_minute: number | null;
  live_extra: number | null;
  live_updated_at: string | null;
};

// The live match minute exactly as the API score feed reported it
// (score-feed-live-minute.sql): "67'", "45+2'" or "מחצית". Nothing is added
// or estimated here — the label moves when the feed's next check writes a
// new minute. Null when the feed never reported this match (scores entered
// by hand) or its report is too old to trust, e.g. the feed was paused.
export function liveMinuteLabel(clock: LiveClock, now: Date): string | null {
  if (!clock.live_status || !clock.live_updated_at) return null;
  const sinceMin = (now.getTime() - new Date(clock.live_updated_at).getTime()) / 60_000;
  if (sinceMin > 20) return null;

  switch (clock.live_status) {
    case "HT":
      return "מחצית";
    case "BT":
      return "הפסקה";
    case "P":
      return "פנדלים";
  }

  if (clock.live_minute === null) return null;
  return clock.live_extra !== null ? `${clock.live_minute}+${clock.live_extra}'` : `${clock.live_minute}'`;
}
