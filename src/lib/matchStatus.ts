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

// The live match minute from the API score feed (score-feed-live-minute.sql),
// as a label like "67'", "45+2'" or "מחצית". The feed only checks every few
// minutes, so the minutes passed since its last check are added on top and
// the clock keeps moving. Past 45/90 without stoppage minutes from the API
// it shows "90+'" rather than a guessed number. Null when the feed never reported
// this match (scores entered by hand) or its report is too old to trust,
// e.g. the feed was paused.
export function liveMinuteLabel(clock: LiveClock, now: Date): string | null {
  if (!clock.live_status || !clock.live_updated_at) return null;
  const sinceMin = Math.floor((now.getTime() - new Date(clock.live_updated_at).getTime()) / 60_000);
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
  const cap = clock.live_status === "1H" ? 45 : clock.live_status === "2H" ? 90 : clock.live_status === "ET" ? 120 : null;
  const minute = clock.live_minute + Math.max(0, sinceMin);
  if (cap === null || minute < cap) return `${minute}'`;
  if (clock.live_extra !== null) return `${cap}+${clock.live_extra + Math.max(0, sinceMin)}'`;
  return `${cap}+'`;
}
