"use client";

import { useState } from "react";
import { TEAM_LOGOS, shortTeamName } from "@/lib/constants";
import { formatIsraelTime } from "@/lib/israelTime";
import type { MatchStatus } from "@/lib/matchStatus";
import {
  CHIP_LABEL,
  computePoints,
  earnPaths,
  outcomeKind,
  type EarnPath,
  type OutcomeKind,
  type ScoringRules,
} from "@/lib/scoring";
import MatchParticipantsList, { type StandingsEntry } from "./MatchParticipantsList";

// One card for a match's whole life (design/boards/States.dc.html):
// meta row → teams row → (live) "how you can still earn" → (live/ended)
// everyone's predictions → bottom strip. Same structure in every state so
// nothing jumps when the match starts.

export type ScorePair = { home: string; away: string };

const GOLD_LIGHT_CHIP = "bg-gold-light text-[#5C4400]";
const GREEN_CHIP = "bg-green-50 text-[#14512D]";
const GREY_CHIP = "bg-[#ECECE6] text-[#3F4440]";

export function chipClass(kind: OutcomeKind) {
  return kind === "exact" ? GOLD_LIGHT_CHIP : kind === "miss" ? GREY_CHIP : GREEN_CHIP;
}

function Crest({ team, size = 40 }: { team: string; size?: number }) {
  const src = TEAM_LOGOS[team];
  if (!src) return <span style={{ width: size, height: size }} className="shrink-0" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" style={{ width: size, height: size }} className="shrink-0 object-contain" />;
}

// Small inline score "h:a". Rendered as a flex row so, under the page's RTL,
// the home number lands on the right next to the home team, like the
// teams row above it.
function MiniScore({ home, away, className = "" }: { home: number | string; away: number | string; className?: string }) {
  return (
    <span className={"inline-flex items-center gap-[5px] font-display tabular-nums " + className}>
      <span>{home}</span>
      <span>:</span>
      <span>{away}</span>
    </span>
  );
}

// ---- icons -------------------------------------------------------------

const stroke = {
  "aria-hidden": true,
  width: 15,
  height: 15,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function TrendIcon() {
  return (
    <svg {...stroke}>
      <path d="M4 16l6-6 4 4 6-6" />
      <path d="M14 8h6v6" />
    </svg>
  );
}

function XMark() {
  return (
    <svg {...stroke}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function CrownIcon({ size = 15 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 9l4.6 3.6L12 5.5l4.4 7.1L21 9l-1.8 9H4.8z" />
      <rect x="4.8" y="19.2" width="14.4" height="2" rx="1" />
      <circle cx="3" cy="8" r="1.6" />
      <circle cx="12" cy="4.2" r="1.7" />
      <circle cx="21" cy="8" r="1.6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg {...stroke}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg {...stroke}>
      <path d="M4 20h4L19 9l-4-4L4 16z" />
      <path d="M13.5 6.5l4 4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg {...stroke}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 21V4h11l-2 4 2 4H5" />
    </svg>
  );
}

function Sparkle({ size, className }: { size: number; className: string }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" className={className}>
      <defs>
        <linearGradient id="pl-sparkle" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#A47A14" />
          <stop offset=".5" stopColor="#FFF3C4" />
          <stop offset="1" stopColor="#A47A14" />
        </linearGradient>
      </defs>
      <path fill="url(#pl-sparkle)" d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z" />
    </svg>
  );
}

// ---- strip ---------------------------------------------------------------

type Strip = { className: string; icon: React.ReactNode; label: string; right: React.ReactNode };

function Points({ value, caption }: { value: number; caption: string }) {
  return (
    <span className="inline-flex items-baseline gap-[5px]">
      <span dir="ltr" className="font-display text-[22px] font-bold leading-none">
        {value > 0 ? `+${value}` : "0"}
      </span>
      <span className="text-xs font-semibold">{caption}</span>
    </span>
  );
}

function outcomeStrip(kind: OutcomeKind, points: number, final: boolean): Strip {
  const caption = final ? "נקודות" : "כרגע";
  const right = <Points value={points} caption={caption} />;
  const towardsLabel = kind === "dirDiff" ? "בכיוון + הפרש מדויק" : kind === "drawDir" ? "כיוון תיקו" : "בכיוון";

  if (kind === "exact") {
    return final
      ? { className: "bg-gold text-gold-ink", icon: <CrownIcon />, label: "בול! ניחוש מדויק", right }
      : {
          className: "bg-gold-light text-[#5C4400] border-t-[1.5px] border-dashed border-[#E2C25A]",
          icon: <CrownIcon />,
          label: "בול! תחזיקו את התוצאה",
          right,
        };
  }
  if (kind === "miss") {
    return final
      ? { className: "bg-miss text-[#3F4440]", icon: <XMark />, label: "פספוס", right }
      : {
          className: "bg-[#F4F4F0] text-[#4E534D] border-t-[1.5px] border-dashed border-miss",
          icon: <XMark />,
          label: "כרגע פספוס, עוד יש זמן",
          right,
        };
  }
  return final
    ? { className: "bg-pitch-600 text-white", icon: <TrendIcon />, label: towardsLabel, right }
    : {
        className: "bg-[#EEF6F0] text-[#14512D] border-t-[1.5px] border-dashed border-[#9CCAAE]",
        icon: <TrendIcon />,
        label: towardsLabel,
        right,
      };
}

// ---- "how you can still earn" -------------------------------------------

function pathText(p: EarnPath, home: string, away: string) {
  const n = (count: number, team: string) => (count === 1 ? `עוד גול ל${team}` : `${count} גולים ל${team}`);
  if (p.addAway === 0) return n(p.addHome, home);
  if (p.addHome === 0) return n(p.addAway, away);
  return `${p.addHome} ל${home}, ${p.addAway} ל${away}`;
}

function EarnPanel({ paths, homeTeam, awayTeam }: { paths: EarnPath[]; homeTeam: string; awayTeam: string }) {
  const home = shortTeamName(homeTeam);
  const away = shortTeamName(awayTeam);
  return (
    <div className="mx-3 mb-1.5 flex flex-col gap-[7px] rounded-xl border border-[#ECECE6] bg-[#FAFAF7] px-2.5 py-[9px]">
      <span className="text-[11px] font-extrabold text-muted">איך עוד אפשר להרוויח</span>
      {paths.map((p) => (
        <div key={p.points} className="flex items-center justify-between gap-2 text-xs font-semibold text-ink">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            {p.addAway === 0 ? (
              <Crest team={homeTeam} size={18} />
            ) : p.addHome === 0 ? (
              <Crest team={awayTeam} size={18} />
            ) : null}
            <span className="truncate">{pathText(p, home, away)}</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-[7px]">
            <MiniScore home={p.home} away={p.away} className="gap-[3px] text-[13px] font-semibold" />
            <span className={"whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-extrabold " + chipClass(p.kind)}>
              {CHIP_LABEL[p.kind]} <span dir="ltr">+{p.points}</span>
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

// ---- card ----------------------------------------------------------------

export default function MatchCard({
  matchId,
  homeTeam,
  awayTeam,
  kickoffAt,
  status,
  homeScore,
  awayScore,
  liveMinute,
  isMainEvent,
  entry,
  saved,
  isDefault,
  pointsEarned,
  editable,
  notOpenYetLabel,
  onChange,
  rules,
  standingsOrder,
  currentUserId,
}: {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  liveMinute: string | null;
  isMainEvent: boolean;
  // What's in the inputs now vs. what's stored in the DB.
  entry: ScorePair;
  saved: ScorePair | null;
  isDefault: boolean;
  pointsEarned: number | null;
  // Inputs accept typing (predictions open and this match's day not locked).
  editable: boolean;
  // Set when predictions for the round haven't opened yet, e.g. "חמישי 20:00".
  notOpenYetLabel: string | null;
  onChange: (side: "home" | "away", value: string) => void;
  rules: ScoringRules;
  standingsOrder: StandingsEntry[];
  currentUserId: string | null;
}) {
  const [showAll, setShowAll] = useState(false);

  const started = status !== "not-started";
  const final = status === "ended";
  const hasScore = started && homeScore !== null && awayScore !== null;
  const predHome = saved ? Number(saved.home) : null;
  const predAway = saved ? Number(saved.away) : null;
  const hasPred = predHome !== null && predAway !== null;

  const kind = hasScore && hasPred ? outcomeKind(predHome, predAway, homeScore!, awayScore!) : null;
  const points =
    kind === null
      ? 0
      : final && pointsEarned !== null
      ? pointsEarned
      : computePoints(predHome!, predAway!, homeScore!, awayScore!, rules);
  const paths =
    status === "live" && hasScore && hasPred ? earnPaths(predHome!, predAway!, homeScore!, awayScore!, rules) : [];

  // Before kickoff: is what's typed already stored?
  const isEmpty = entry.home === "" && entry.away === "";
  const isFilled = entry.home !== "" && entry.away !== "";
  const isSaved = isFilled && saved !== null && saved.home === entry.home && saved.away === entry.away;
  const needsPrediction = !started && editable && !isSaved;

  // ---- strip -----------------------------------------------------------
  let strip: Strip;
  if (kind !== null) {
    strip = outcomeStrip(kind, points, final);
  } else if (started) {
    strip = hasPred
      ? { className: "bg-[#F4F4F0] text-[#4E534D]", icon: <FlagIcon />, label: "ממתינים לתוצאה", right: null }
      : {
          className: "bg-[#F4F4F0] text-[#4E534D]",
          icon: <XMark />,
          label: "לא ניחשת במשחק הזה",
          right: final ? <Points value={0} caption="נקודות" /> : null,
        };
  } else if (notOpenYetLabel) {
    strip = {
      className: "bg-[#F4F4F0] text-[#4E534D]",
      icon: <LockIcon />,
      label: "ההגשה עוד לא נפתחה",
      right: <span className="text-xs font-semibold">נפתחת {notOpenYetLabel}</span>,
    };
  } else if (!editable) {
    strip = hasPred
      ? {
          className: "bg-green-50 text-[#14512D]",
          icon: <LockIcon />,
          label: "הניחוש ננעל",
          right: <span className="text-xs font-semibold">פתיחה ב־{formatIsraelTime(kickoffAt)}</span>,
        }
      : {
          className: "bg-cream text-[#6E5200]",
          icon: <LockIcon />,
          label: "ננעל בלי ניחוש",
          right: <span className="text-xs font-semibold">תיכנס תוצאת ברירת המחדל</span>,
        };
  } else if (isSaved) {
    strip = {
      className: "bg-green-50 text-[#14512D]",
      icon: <CheckIcon />,
      label: "הניחוש נשמר",
      right: <span className="text-xs font-semibold">אפשר לשנות עד הפתיחה</span>,
    };
  } else if (!isEmpty) {
    strip = {
      className: "bg-cream text-[#6E5200]",
      icon: <PencilIcon />,
      label: "עוד לא נשמר",
      right: <span className="text-xs font-semibold">לחצו על ״שמירת ניחושים״</span>,
    };
  } else {
    strip = {
      className: "bg-cream text-[#6E5200]",
      icon: <PencilIcon />,
      label: "עוד לא ניחשת",
      right: <span className="text-xs font-semibold">ננעל בשריקת הפתיחה</span>,
    };
  }

  // ---- card frame --------------------------------------------------------
  const frame =
    kind === "exact"
      ? "border-gold" + (final ? "" : " shadow-[0_0_0_4px_rgba(201,162,39,.16)]")
      : kind && kind !== "miss" && !final
      ? "border-[1.5px] border-[#9CCAAE] bg-white"
      : "border border-line bg-white";

  // ---- inputs style --------------------------------------------------------
  const boxClass = isSaved
    ? "border-2 border-solid border-pitch-600 bg-white"
    : isEmpty || !isFilled
    ? "border-2 border-dashed border-gold-500 bg-[#FFFDF5]"
    : "border-2 border-solid border-gold-500 bg-white";

  const pickChip =
    kind === "exact"
      ? "bg-gold text-gold-ink"
      : kind === "miss" && final
      ? "bg-[#F1F1EC] text-[#6B6F68] line-through"
      : kind && kind !== "miss"
      ? "bg-green-50 text-[#14512D]"
      : "bg-[#F1F1EC] text-ink";

  return (
    <article
      id={`match-${matchId}`}
      data-needs-prediction={needsPrediction ? "true" : undefined}
      className={"scroll-mt-24 overflow-hidden rounded-[18px] shadow-[0_1px_2px_rgba(17,17,17,.05)] " + frame}
    >
      {/* meta */}
      <div className="flex items-center justify-between gap-2 px-3.5 pt-3">
        <span className="flex items-center gap-1.5">
          {status === "live" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-[3px] text-xs font-bold text-[#14512D]">
              <span className="pl-pulse inline-block h-[7px] w-[7px] rounded-full bg-pitch-600" />
              בשידור חי
              {liveMinute && (
                <>
                  {" · "}
                  <span dir="ltr">{liveMinute.replace("'", "׳")}</span>
                </>
              )}
            </span>
          ) : final ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFEFEA] px-2.5 py-[3px] text-xs font-bold text-muted">
              <FlagIcon />
              הסתיים
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFEFEA] px-2.5 py-[3px] text-xs font-bold text-muted">
              <span className="inline-block h-[7px] w-[7px] rounded-full bg-[#8E918A]" />
              טרם החל
            </span>
          )}
          {isMainEvent && (
            <span className="bg-gold-light inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[11px] font-extrabold text-[#5C4400]">
              <CrownIcon size={12} />
              המשחק המרכזי
            </span>
          )}
        </span>
        <span className="text-xs font-medium text-muted">
          {status === "live" ? "תוצאה חיה" : final ? "תוצאה סופית" : formatIsraelTime(kickoffAt)}
        </span>
      </div>

      {/* teams */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 py-3.5">
        <div className="flex min-w-0 flex-col items-center gap-1.5">
          <Crest team={homeTeam} />
          <span className="max-w-full truncate text-[13px] font-bold">{shortTeamName(homeTeam)}</span>
        </div>

        <div className="relative flex min-w-[124px] flex-col items-center gap-[7px]">
          {started ? (
            <>
              {kind === "exact" && final && (
                <>
                  <Sparkle size={14} className="absolute -top-1.5 right-0.5" />
                  <Sparkle size={10} className="absolute left-0 top-[18px]" />
                </>
              )}
              <div className="flex items-center gap-2.5 font-display text-[40px] font-bold leading-none tabular-nums">
                <span>{hasScore ? homeScore : "–"}</span>
                <span className={"text-[26px] font-medium " + (kind === "exact" ? "text-gold" : "text-[#A3A39B]")}>:</span>
                <span>{hasScore ? awayScore : "–"}</span>
              </div>
              {hasPred ? (
                <span
                  className={
                    "inline-flex flex-wrap items-center justify-center gap-1.5 text-xs font-semibold " +
                    (kind === "exact" ? "text-[#6E5200]" : "text-muted")
                  }
                >
                  ניחשת
                  <MiniScore home={predHome} away={predAway} className={"rounded-md px-2 py-px text-sm font-semibold " + pickChip} />
                  {isDefault && (
                    <span className="rounded-full bg-[#ECECE6] px-1.5 py-px text-[10px] font-bold text-muted">ברירת מחדל</span>
                  )}
                </span>
              ) : (
                <span className="text-xs font-semibold text-muted">לא ניחשת</span>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                {(["home", "away"] as const).map((side, i) => (
                  <span key={side} className="contents">
                    {i === 1 && <span className="font-display text-[26px] font-medium text-[#A3A39B]">:</span>}
                    <input
                      value={entry[side]}
                      onChange={(e) => onChange(side, e.target.value)}
                      disabled={!editable}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      placeholder="–"
                      aria-label={`שערים ל${side === "home" ? homeTeam : awayTeam}`}
                      className={
                        "h-[52px] w-[46px] rounded-[10px] text-center font-display text-[26px] font-bold text-ink outline-none placeholder:text-[#C9C3A8] focus-visible:ring-2 focus-visible:ring-pitch-600/40 disabled:opacity-70 " +
                        boxClass
                      }
                    />
                  </span>
                ))}
              </div>
              <span className="text-xs font-semibold text-muted">הניחוש שלך</span>
            </>
          )}
        </div>

        <div className="flex min-w-0 flex-col items-center gap-1.5">
          <Crest team={awayTeam} />
          <span className="max-w-full truncate text-[13px] font-bold">{shortTeamName(awayTeam)}</span>
        </div>
      </div>

      {paths.length > 0 && <EarnPanel paths={paths} homeTeam={homeTeam} awayTeam={awayTeam} />}

      {/* everyone's predictions — only after kickoff */}
      {started && (
        <>
          <div className="flex justify-center pb-1">
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              aria-expanded={showAll}
              className="inline-flex min-h-9 items-center gap-1 px-2 text-xs font-bold text-pitch-600"
            >
              {showAll ? "הסתר ניחושים" : "ניחושי כל המשתתפים"}
              <svg
                aria-hidden="true"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                className={showAll ? "rotate-180" : ""}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>
          {showAll && (
            <MatchParticipantsList
              matchId={matchId}
              homeScore={homeScore}
              awayScore={awayScore}
              final={final}
              rules={rules}
              standingsOrder={standingsOrder}
              currentUserId={currentUserId}
            />
          )}
        </>
      )}

      <div className={"flex min-h-11 items-center justify-between gap-2 px-3.5 py-2.5 text-[13px] font-bold " + strip.className}>
        <span className="inline-flex items-center gap-1.5">
          {strip.icon}
          {strip.label}
        </span>
        {strip.right}
      </div>
    </article>
  );
}
