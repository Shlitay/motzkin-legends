import BottomNav from "@/components/BottomNav";
import StatCard from "@/components/StatCard";
import TopBar from "@/components/TopBar";
import { currentUser, lastRoundStats, seasonStats } from "@/lib/mock-data";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center gap-10 px-6 pb-24 pt-28">
      <TopBar />
      <div className="flex flex-col items-center gap-2">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-3xl">
          {currentUser.avatar}
        </div>
        <p className="font-medium text-ink">{currentUser.fullName}</p>
      </div>

      <StatCard
        title="Last round"
        headline={`Place: ${lastRoundStats.place}`}
        towards={lastRoundStats.towards}
        points={lastRoundStats.points}
        hit={lastRoundStats.hit}
      />

      <StatCard
        title="All season"
        headline={`Total participation: ${seasonStats.totalParticipation}`}
        towards={seasonStats.towards}
        points={seasonStats.points}
        hit={seasonStats.hit}
      />

      <BottomNav />
    </main>
  );
}
