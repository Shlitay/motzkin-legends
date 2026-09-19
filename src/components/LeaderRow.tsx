import RankBadge from "@/components/RankBadge";
import { CrownIcon } from "@/components/icons";

const ROW_TINT: Record<number, string> = {
  1: "bg-[#D4AF37]/15",
  2: "bg-[#C0C0C0]/20",
  3: "bg-[#CD7F32]/15",
};

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
};

// Each value's unit (points/hits/rounds) is a column header above the table
// (see LeaderTable) rather than repeated as a label on every row.
export function statColumnClass(columnCount: number) {
  // Header and row cells must share one width or they drift apart — a
  // single column can stay compact, several need room for the widest
  // Hebrew label ("מחזורים").
  return columnCount > 1 ? "w-11 text-end" : "min-w-8 text-end";
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
}: LeaderRowProps) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-5 py-3 text-start ${ROW_TINT[rank] ?? ""} ${
        onClick ? "hover:bg-black/5" : ""
      }`}
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
      <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
        {jackpotLabel && (
          <span className="shine-badge whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-extrabold text-white shadow [text-shadow:0_1px_1px_rgba(0,0,0,0.35)] [background:linear-gradient(135deg,#f6e6ab_0%,#d9b74a_35%,#c9a227_65%,#a8811f_100%)]">
            {jackpotLabel}
          </span>
        )}
        <span className="font-medium text-ink">{name}</span>
      </span>
      <span className={`flex shrink-0 items-center ${values.length > 1 ? "gap-2" : "gap-4"}`}>
        {values.map((v, i) => (
          <span
            key={i}
            className={`${statColumnClass(values.length)} font-display text-sm font-semibold tabular-nums ${
              i === values.length - 1 ? "text-ink" : "text-muted"
            }`}
          >
            {v}
          </span>
        ))}
      </span>
    </Wrapper>
  );
}
