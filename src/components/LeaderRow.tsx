import RankBadge from "@/components/RankBadge";

const ROW_TINT: Record<number, string> = {
  1: "bg-[#D4AF37]/15",
  2: "bg-[#C0C0C0]/20",
  3: "bg-[#CD7F32]/15",
};

type LeaderRowProps = {
  rank: number;
  avatar: string;
  name: string;
  count: number;
  countLabel?: string;
};

export default function LeaderRow({ rank, avatar, name, count, countLabel }: LeaderRowProps) {
  return (
    <div className={`flex items-center gap-3 px-5 py-3 ${ROW_TINT[rank] ?? ""}`}>
      <RankBadge rank={rank} />
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-lg">
        {avatar}
      </span>
      <span className="flex-1 font-medium text-ink">{name}</span>
      <span className="font-display text-sm font-semibold tabular-nums text-ink">
        {count}
        {countLabel && <span className="ml-1 font-normal text-muted">{countLabel}</span>}
      </span>
    </div>
  );
}
