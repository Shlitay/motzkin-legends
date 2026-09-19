import { ChevronIcon } from "@/components/icons";
import { TEAM_LOGOS, shortTeamName } from "@/lib/constants";
import { deriveOutcome, type Outcome } from "@/lib/predictionOutcome";
import MainEventBadge from "./MainEventBadge";

export const OUTCOME_STYLES: Record<
  Outcome,
  { rail: string; pointsBg: string; pointsBorder: string; pointsText: string; caption: string; label: string }
> = {
  exact: {
    rail: "bg-[oklch(0.62_0.14_150)]",
    pointsBg: "bg-[oklch(0.96_0.035_150)]",
    pointsBorder: "oklch(0.92 0.05 150)",
    pointsText: "text-[oklch(0.42_0.11_150)]",
    caption: "text-[oklch(0.55_0.08_150)]",
    label: "ניחוש מדויק",
  },
  direction: {
    rail: "bg-[oklch(0.75_0.14_80)]",
    pointsBg: "bg-[oklch(0.97_0.04_85)]",
    pointsBorder: "oklch(0.93 0.06 85)",
    pointsText: "text-[oklch(0.5_0.11_80)]",
    caption: "text-[oklch(0.6_0.08_80)]",
    label: "כיוון נכון",
  },
  miss: {
    rail: "bg-[#d6d5cf]",
    pointsBg: "bg-[#faf9f7]",
    pointsBorder: "#ecebe6",
    pointsText: "text-[#b5b5ad]",
    caption: "text-[#c4c4bc]",
    label: "פספוס",
  },
};

function TeamCrest({ team }: { team: string }) {
  const src = TEAM_LOGOS[team];
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full">
      {src && <img src={src} alt="" className="h-8 w-8 object-contain" />}
    </div>
  );
}

// Design handoff: "Prediction Result Card" (variant 1B), 2026-08-24 —
// status rail + body + points column, recreated pixel-for-pixel from the
// exported .dc.html spec rather than the earlier gold/silver/gray tier
// card it replaces.
export default function EndedMatchCard({
  homeTeam,
  awayTeam,
  predHome,
  predAway,
  actualHome,
  actualAway,
  points,
  isMainEvent = false,
  expanded = false,
  onToggle,
}: {
  homeTeam: string;
  awayTeam: string;
  predHome: number;
  predAway: number;
  actualHome: number;
  actualAway: number;
  points: number | null;
  isMainEvent?: boolean;
  // When onToggle is given the whole card is one tap target for "view
  // everyone's predictions" (the link text inside it is just the label);
  // `expanded` only drives the chevron and aria state.
  expanded?: boolean;
  onToggle?: () => void;
}) {
  const outcome = deriveOutcome(predHome, predAway, actualHome, actualAway);
  const s = OUTCOME_STYLES[outcome];
  const pointsLabel = points === null ? "" : points > 0 ? `+${points}` : "0";

  return (
    <div
      className={`flex overflow-hidden rounded-[18px] border bg-white shadow-[0_1px_2px_rgba(17,17,17,.04)] ${
        isMainEvent ? "border-[#d4a017]" : "border-[#e6e6e1]"
      } ${onToggle ? "cursor-pointer" : ""}`}
      {...(onToggle && {
        role: "button",
        tabIndex: 0,
        "aria-expanded": expanded,
        onClick: onToggle,
        onKeyDown: (ev: React.KeyboardEvent) => {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            onToggle();
          }
        },
      })}
    >
      {/* Explicit corner rounding on the rail/points column too, not just
          relying on the parent's overflow-hidden clip — belt-and-braces
          so their own colored backgrounds definitely get the card's
          curve on their outer edge (rail = right side, points = left
          side, since the row visually mirrors under RTL). */}
      <div className={`w-[5px] shrink-0 rounded-r-[18px] ${s.rail}`} />
      <div className="flex-1 px-4 py-3.5">
        {isMainEvent && <MainEventBadge className="mb-2" />}
        <div className="mb-2.5 flex items-center justify-between">
          {/* First DOM child renders at the box's RTL start (right) — this
              must be the meta text, not the outcome label, matching the
              design source's own child order (metaText, then
              outcomeLabel). Confirmed against the .dc.html source and a
              rendered screenshot, not assumed from the README prose alone,
              since an earlier version of this file swapped these. */}
          <span className="text-[11px] font-extrabold tracking-[.08em] text-[#a3a39b]">
            הסתיים
          </span>
          <span className={`text-[11px] font-extrabold tracking-[.08em] ${s.pointsText}`}>{s.label}</span>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3.5">
          <div className="flex flex-col items-center gap-[7px]">
            <TeamCrest team={homeTeam} />
            <span className="whitespace-nowrap text-[13px] font-bold text-ink">{shortTeamName(homeTeam)}</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            {/* Home renders visually *right* (RTL mirroring, same as every
                other row in this app), but a dir="ltr" span always reads
                left-to-right regardless — so "home : away" would put
                home's digit on the *left*, right next to the away team
                box instead of its own. Away-first is what actually lines
                each digit up with its own team, matching the same fix
                this codebase already needed once before (see MatchRow's
                current-result line). The design handoff's own literal
                markup had this the "obvious" home-first way, which is
                exactly the kind of RTL bug that only shows up with real,
                lopsided scores rather than the handoff's own near-even
                sample data (2:1, 1:1). */}
            <span
              className="font-display text-[34px] font-black leading-none tracking-[0.02em] tabular-nums text-ink"
              dir="ltr"
              style={{ unicodeBidi: "isolate" }}
            >
              {actualAway} : {actualHome}
            </span>
            <span className={`text-xs font-semibold tabular-nums text-[#a3a39b] ${outcome === "miss" ? "line-through" : ""}`}>
              ניחשת{" "}
              <span dir="ltr" style={{ unicodeBidi: "isolate" }}>
                {predAway} : {predHome}
              </span>
            </span>
          </div>
          <div className="flex flex-col items-center gap-[7px]">
            <TeamCrest team={awayTeam} />
            <span className="whitespace-nowrap text-[13px] font-bold text-ink">{shortTeamName(awayTeam)}</span>
          </div>
        </div>
        {onToggle && (
          <div className="mt-2.5 flex items-center justify-center gap-1 text-xs font-medium text-brand">
            צפייה בניחושי כל המשתתפים
            <ChevronIcon size={12} className={expanded ? "rotate-90" : "-rotate-90"} />
          </div>
        )}
      </div>
      <div
        className={`flex w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-l-[18px] ${s.pointsBg}`}
        style={{ borderInlineStart: `1px solid ${s.pointsBorder}` }}
      >
        <span
          className={`text-[28px] font-black leading-none ${s.pointsText}`}
          dir="ltr"
          style={{ unicodeBidi: "isolate" }}
        >
          {pointsLabel}
        </span>
        <span className={`text-[11px] font-bold ${s.caption}`}>נקודות</span>
      </div>
    </div>
  );
}
