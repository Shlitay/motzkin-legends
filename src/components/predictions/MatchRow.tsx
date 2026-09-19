"use client";

import { formatMatchKickoff } from "@/lib/israelTime";
import { TEAM_LOGOS, shortTeamName } from "@/lib/constants";
import type { MatchStatus } from "@/lib/matchStatus";
import { deriveOutcome, type Outcome } from "@/lib/predictionOutcome";
import MainEventBadge from "./MainEventBadge";
import MatchParticipantsToggle from "./MatchParticipantsToggle";

// Ended matches use EndedMatchCard's own outcome label instead of this
// badge, so it only ever renders for the other two statuses.
function MatchStatusBadge({ status }: { status: Exclude<MatchStatus, "ended"> }) {
  const config: Record<
    Exclude<MatchStatus, "ended">,
    { label: string; dot: string; bg: string; text: string; border: string }
  > = {
    "not-started": { label: "טרם החל", dot: "bg-neutral-400", bg: "bg-neutral-100", text: "text-neutral-500", border: "" },
    live: { label: "בשידור חי", dot: "bg-brand animate-pulse", bg: "bg-brand/10", text: "text-brand", border: "border border-black" },
  };
  const c = config[status];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${c.bg} ${c.text} ${c.border}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function TeamLogo({ team }: { team: string }) {
  const src = TEAM_LOGOS[team];
  if (!src) return null;
  return <img src={src} alt="" className="h-8 w-8 shrink-0 object-contain" />;
}

// While a match is actually live, a locked-in prediction gets a visual
// nudge for its current standing against the live score — gold and
// bigger for a current exact hit, circled green for a current correct-
// direction ("towards") hit. Deliberately the reverse of this app's
// usual exact=green/direction=gold convention (EndedMatchCard, /rules'
// scoring ladder) — the user asked for gold specifically on the exact
// hit here, to read as "the big one," not for consistency with those.
function ScoreBox({
  value,
  onChange,
  readOnly,
  liveOutcome,
}: {
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  liveOutcome?: Outcome | null;
}) {
  if (readOnly) {
    if (liveOutcome === "exact") {
      return (
        <div className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-draw text-sm font-bold text-white">
          {value}
        </div>
      );
    }
    return (
      <div
        className={`font-display flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white ${
          liveOutcome === "direction" ? "ring-2 ring-brand ring-offset-1" : ""
        }`}
      >
        {value}
      </div>
    );
  }
  return (
    <input
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      inputMode="numeric"
      maxLength={1}
      className="h-7 w-7 shrink-0 rounded border border-neutral-300 text-center text-xs"
    />
  );
}

// Live and not-started matches only — ended matches render via
// EndedMatchCard instead.
export default function MatchRow({
  matchId,
  homeTeam,
  awayTeam,
  home,
  away,
  onChangeHome,
  onChangeAway,
  readOnly = false,
  finalHomeScore = null,
  finalAwayScore = null,
  status,
  kickoffAt,
  isMainEvent = false,
  standingsOrder = [],
}: {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  home: string;
  away: string;
  onChangeHome?: (v: string) => void;
  onChangeAway?: (v: string) => void;
  readOnly?: boolean;
  finalHomeScore?: number | null;
  finalAwayScore?: number | null;
  status: Exclude<MatchStatus, "ended">;
  kickoffAt: string;
  isMainEvent?: boolean;
  // Current round standings order (round_participation.rank), fetched
  // once per round by the page and passed down — only used once expanded
  // to show "who predicted what" in the same order as /leaderboard's
  // round-points table, not fetched again per match.
  standingsOrder?: { userId: string; name: string; avatar: string }[];
}) {
  const homeNum = home === "" ? null : Number(home);
  const awayNum = away === "" ? null : Number(away);
  const hasBoth = homeNum !== null && awayNum !== null;
  const isDraw = hasBoth && homeNum === awayNum;
  const homeWins = hasBoth && homeNum! > awayNum!;
  const awayWins = hasBoth && awayNum! > homeNum!;

  const teamClass = (winning: boolean) =>
    isDraw ? "bg-draw/15 border-draw/45" : winning ? "bg-brand/15 border-brand/40" : "border-neutral-200";

  // A match that genuinely hasn't started yet has no real result to show,
  // even if its score happens to be sitting at 0-0 in the DB (the pre-fix
  // 0-0 seeding wasn't kickoff-gated, so this also guards against stale
  // production data until that migration is run).
  const hasFinalScore = status !== "not-started" && finalHomeScore !== null && finalAwayScore !== null;

  // Only while the match is actually live — once it ends, EndedMatchCard
  // takes over with its own (differently-colored) outcome treatment.
  const liveOutcome =
    status === "live" && hasBoth && finalHomeScore !== null && finalAwayScore !== null
      ? deriveOutcome(homeNum!, awayNum!, finalHomeScore, finalAwayScore)
      : null;

  return (
    <div
      className={`rounded-xl border p-3 ${
        isMainEvent ? "border-[#d4a017] bg-[#d4a017]/5" : "border-neutral-200 bg-surface"
      }`}
    >
      {isMainEvent && <MainEventBadge className="mb-2" />}
      {status === "not-started" ? (
        // justify-between with the badge first in DOM puts it at the box's
        // top right (RTL start) and the kickoff time at top left (RTL end).
        <div className="mb-2 flex items-center justify-between">
          <MatchStatusBadge status={status} />
          <span className="text-xs text-muted" dir="ltr">
            {formatMatchKickoff(kickoffAt)}
          </span>
        </div>
      ) : (
        <div className="mb-2 flex justify-center">
          <MatchStatusBadge status={status} />
        </div>
      )}
      <div className="flex items-center gap-2">
        <div className={`flex flex-1 items-center gap-2.5 overflow-hidden rounded-lg border py-3 pe-3 text-sm ${teamClass(homeWins)}`}>
          <TeamLogo team={homeTeam} />
          <span>{shortTeamName(homeTeam)}</span>
        </div>
        <ScoreBox value={home} onChange={onChangeHome} readOnly={readOnly} liveOutcome={liveOutcome} />
        <ScoreBox value={away} onChange={onChangeAway} readOnly={readOnly} liveOutcome={liveOutcome} />
        <div className={`flex flex-1 items-center justify-end gap-2.5 overflow-hidden rounded-lg border py-3 ps-3 text-end text-sm ${teamClass(awayWins)}`}>
          <span>{shortTeamName(awayTeam)}</span>
          <TeamLogo team={awayTeam} />
        </div>
      </div>
      {hasFinalScore && (
        // The row above is a flex row that mirrors under the page's global
        // RTL — home_box is DOM-first so it lands visually *rightmost*,
        // away_box visually *leftmost*. This plain-text line doesn't
        // participate in that flex mirroring, so its number order has to
        // be set to match by hand: away score first (aligns under the
        // away box on the left), home score second (aligns under the home
        // box on the right) — not source/home-first, which would silently
        // mismatch the row's actual left-right layout.
        <p className="mt-1 text-center text-xs text-muted">
          תוצאה נוכחית: {finalAwayScore}-{finalHomeScore}
        </p>
      )}
      {readOnly && (
        <MatchParticipantsToggle
          matchId={matchId}
          homeScore={finalHomeScore}
          awayScore={finalAwayScore}
          standingsOrder={standingsOrder}
        />
      )}
    </div>
  );
}
