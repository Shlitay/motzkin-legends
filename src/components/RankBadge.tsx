const RANK_STYLES: Record<number, string> = {
  1: "bg-[#D4AF37] text-[#3B2F06]", // gold
  2: "bg-[#C0C0C0] text-[#3A3A3A]", // silver
  3: "bg-[#CD7F32] text-white", // bronze
};

export default function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      className={
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold " +
        (RANK_STYLES[rank] ?? "bg-neutral-100 text-neutral-500")
      }
    >
      {rank}
    </span>
  );
}
