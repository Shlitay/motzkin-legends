import BottomNav from "@/components/BottomNav";
import LeaderRow from "@/components/LeaderRow";
import TopBar from "@/components/TopBar";
import {
  currentRound,
  currentRoundPoints,
  mostPlayedUsers,
  seasonPoints,
} from "@/lib/mock-data";

export default function LeaderboardPage() {
  return (
    <main className="flex min-h-screen flex-col items-center gap-8 px-6 pb-24 pt-28">
      <TopBar />
      <h1 className="text-lg font-medium text-ink">League board</h1>

      <LeaderTable
        title={`Round ${currentRound.roundNumber} points`}
        rows={currentRoundPoints}
        countLabel="pts"
      />
      <LeaderTable title="Most points (season)" rows={seasonPoints} countLabel="pts" />
      <LeaderTable title="Most played" rows={mostPlayedUsers} countLabel="rounds" />

      <BottomNav />
    </main>
  );
}

function LeaderTable({
  title,
  rows,
  countLabel,
}: {
  title: string;
  rows: { name: string; avatar: string; count: number }[];
  countLabel: string;
}) {
  return (
    <section className="w-full max-w-md overflow-hidden rounded-[28px] bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_32px_-18px_rgba(0,0,0,0.28)]">
      <h2 className="px-5 pb-1 pt-5 text-sm font-semibold uppercase tracking-wide text-muted">
        {title}
      </h2>
      <div className="divide-y divide-neutral-100">
        {rows.map((r, i) => (
          <LeaderRow
            key={r.name}
            rank={i + 1}
            avatar={r.avatar}
            name={r.name}
            count={r.count}
            countLabel={countLabel}
          />
        ))}
      </div>
    </section>
  );
}
