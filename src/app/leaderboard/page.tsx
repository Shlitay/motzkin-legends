"use client";

import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import LeaderRow from "@/components/LeaderRow";
import TopBar from "@/components/TopBar";
import { createClient } from "@/lib/supabase/client";

type Row = { name: string; avatar: string; count: number };

type RawRoundParticipationRow = {
  total_points: number | null;
  users: { full_name: string; avatar: string | null } | null;
};

type SeasonStatsRow = {
  full_name: string;
  avatar: string | null;
  total_points: number;
  rounds_played: number;
};

export default function LeaderboardPage() {
  const [supabase] = useState(() => createClient());
  const [roundNumber, setRoundNumber] = useState<number | null>(null);
  const [currentRoundPoints, setCurrentRoundPoints] = useState<Row[]>([]);
  const [seasonPoints, setSeasonPoints] = useState<Row[]>([]);
  const [mostPlayed, setMostPlayed] = useState<Row[]>([]);

  useEffect(() => {
    (async () => {
      const { data: round } = await supabase
        .from("rounds")
        .select("id, round_number")
        .eq("status", "open")
        .single();

      if (round) {
        setRoundNumber(round.round_number);

        const { data: rows } = await supabase
          .from("round_participation")
          .select("total_points, users(full_name, avatar)")
          .eq("round_id", round.id)
          .overrideTypes<RawRoundParticipationRow[], { merge: false }>();

        setCurrentRoundPoints(
          (rows ?? [])
            .map((r) => ({
              name: r.users?.full_name ?? "Unknown",
              avatar: r.users?.avatar ?? "🙂",
              count: r.total_points ?? 0,
            }))
            .sort((a, b) => b.count - a.count)
        );
      }

      const { data: stats } = await supabase
        .from("season_stats")
        .select("full_name, avatar, total_points, rounds_played")
        .overrideTypes<SeasonStatsRow[], { merge: false }>();

      const seasonRows = stats ?? [];
      setSeasonPoints(
        seasonRows
          .map((s) => ({ name: s.full_name, avatar: s.avatar ?? "🙂", count: s.total_points }))
          .sort((a, b) => b.count - a.count)
      );
      setMostPlayed(
        seasonRows
          .map((s) => ({ name: s.full_name, avatar: s.avatar ?? "🙂", count: s.rounds_played }))
          .sort((a, b) => b.count - a.count)
      );
    })();
  }, [supabase]);

  return (
    <main className="flex min-h-screen flex-col items-center gap-8 px-6 pb-24 pt-28">
      <TopBar />
      <h1 className="text-lg font-medium text-ink">League board</h1>

      {roundNumber !== null && (
        <LeaderTable title={`Round ${roundNumber} points`} rows={currentRoundPoints} countLabel="pts" />
      )}
      <LeaderTable title="Most points (season)" rows={seasonPoints} countLabel="pts" />
      <LeaderTable title="Most played" rows={mostPlayed} countLabel="rounds" />

      <BottomNav />
    </main>
  );
}

function LeaderTable({ title, rows, countLabel }: { title: string; rows: Row[]; countLabel: string }) {
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
