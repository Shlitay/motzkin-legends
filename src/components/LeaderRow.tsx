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
  onClick?: () => void;
};

export default function LeaderRow({ rank, avatar, name, count, countLabel, onClick }: LeaderRowProps) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-5 py-3 text-left ${ROW_TINT[rank] ?? ""} ${
        onClick ? "hover:bg-black/5" : ""
      }`}
    >
      <RankBadge rank={rank} />
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-lg">
        {avatar}
      </span>
      <span className="flex-1 font-medium text-ink">{name}</span>
      <span className="font-display text-sm font-semibold tabular-nums text-ink">
        {count}
        {countLabel && <span className="ml-1 font-normal text-muted">{countLabel}</span>}
      </span>
    </Wrapper>
  );
}
