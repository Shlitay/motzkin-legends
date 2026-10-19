import RankBadge from "@/components/RankBadge";
import { ArrowUpRightIcon, CrownIcon, TargetIcon } from "@/components/icons";

type LeaderRowProps = {
  rank: number;
  avatar: string;
  // Season table leaves the avatar out to give the name (and its four stat
  // columns) more room; the round table keeps it, and its crown badge
  // hangs off the avatar.
  hideAvatar?: boolean;
  name: string;
  // One number per column, in the same order as LeaderTable's column
  // labels. The last one is the primary stat (points) and gets full ink;
  // any before it (season table: hits, towards, rounds) are muted so they
  // don't compete with it.
  values: number[];
  onClick?: () => void;
  // Round-winner treatment — only ever passed for rank 1 on the current
  // round's points table, once that round is finished (see /leaderboard).
  crown?: boolean;
  jackpotLabel?: string;
  // Round-points table only — this round's exact-score/correct-direction
  // counts, shown as two small colored badges rather than extra plain-text
  // columns (the season table already shows its own version of these as
  // columns, via `values`). Green = exact, gold = towards, matching the
  // convention used everywhere else results are shown (ended-match cards,
  // /rules) — not the reversed one used for live in-progress feedback.
  // Undefined on the season table, where neither badge renders.
  exactCount?: number;
  towardsCount?: number;
  // Highlights this row as the viewer's own — replaces the old gold/
  // silver/bronze rank-1/2/3 row tint, which made it harder to spot
  // yourself in the table at a glance (the rank badge's own circle color
  // already carries the 1st/2nd/3rd signal, so the row background is
  // free to mean something else instead).
  isCurrentUser?: boolean;
};

// Each value's unit (points/hits/rounds) is a column header above the table
// (see LeaderTable) rather than repeated as a label on every row.
export function statColumnClass(columnCount: number) {
  // Header and row cells must share one width or they drift apart — a
  // single column can stay compact, several need room for the widest
  // Hebrew label ("מחזורים"). Several columns are also centered (header
  // and values alike) so each number sits under its label, rather than
  // both hugging the same edge and drifting apart by their width
  // difference.
  return columnCount > 1 ? "w-11 text-center" : "min-w-8 text-end";
}

export default function LeaderRow({
  rank,
  avatar,
  hideAvatar = false,
  name,
  values,
  onClick,
  crown = false,
  jackpotLabel,
  exactCount,
  towardsCount,
  isCurrentUser = false,
}: LeaderRowProps) {
  const Wrapper = onClick ? "button" : "div";
  // Only the round table ever passes these — fixing the name to a column
  // width only makes sense (and only triggers) there, so the season table
  // keeps its original full-width, un-truncated name.
  const hasBadges = exactCount !== undefined || towardsCount !== undefined;
  return (
    <Wrapper
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-5 py-3 text-start ${
        isCurrentUser ? "bg-brand/10" : ""
      } ${rank === 3 ? "border-b border-neutral-400" : ""} ${onClick ? "hover:bg-black/5" : ""}`}
    >
      <RankBadge rank={rank} />
      {!hideAvatar && (
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-lg">
          {avatar}
          {crown && (
            // Avatar circle is 36px (h-9 w-9) — sized/positioned so roughly
            // the crown's bottom quarter overlaps the top of the circle,
            // rather than floating entirely above it.
            <CrownIcon
              size={24}
              className="absolute -top-[15px] -end-[6px] -rotate-[22deg] text-[#d9b74a] drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]"
            />
          )}
        </span>
      )}
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        <span
          className={`flex flex-col items-start gap-1 ${
            hasBadges ? "w-[100px] shrink-0" : "min-w-0 flex-1"
          }`}
        >
          {jackpotLabel && (
            <span className="shine-badge whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-extrabold text-white shadow [text-shadow:0_1px_1px_rgba(0,0,0,0.35)] [background:linear-gradient(135deg,#f6e6ab_0%,#d9b74a_35%,#c9a227_65%,#a8811f_100%)]">
              {jackpotLabel}
            </span>
          )}
          <span className={`w-full truncate text-ink ${isCurrentUser ? "font-bold" : "font-medium"}`}>
            {name}
          </span>
        </span>
        {hasBadges && (
          <span className="flex shrink-0 items-center gap-[5.28px]">
            {exactCount !== undefined && (
              <span className="relative shrink-0">
                <span className="font-display flex h-[18px] w-[18px] items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">
                  {exactCount}
                </span>
                <span className="absolute -top-1 -end-1 flex h-[10px] w-[10px] items-center justify-center rounded-full bg-white">
                  <TargetIcon size={7} className="text-brand" />
                </span>
              </span>
            )}
            {towardsCount !== undefined && (
              <span className="relative shrink-0">
                <span className="font-display flex h-[18px] w-[18px] items-center justify-center rounded-full bg-draw text-[11px] font-bold text-white">
                  {towardsCount}
                </span>
                <span className="absolute -top-1 -end-1 flex h-[10px] w-[10px] items-center justify-center rounded-full bg-white">
                  <ArrowUpRightIcon size={7} className="text-draw" />
                </span>
              </span>
            )}
          </span>
        )}
      </span>
      <span className={`flex shrink-0 items-center ${values.length > 1 ? "gap-2" : "gap-4"}`}>
        {values.map((v, i) => (
          <span
            key={i}
            className={`${statColumnClass(values.length)} font-display font-semibold tabular-nums ${
              i === values.length - 1 ? "text-[17px] text-ink" : "text-sm text-muted"
            }`}
          >
            {v}
          </span>
        ))}
      </span>
    </Wrapper>
  );
}
