"use client";

import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import LeaderRow from "@/components/LeaderRow";
import NewsTicker from "@/components/NewsTicker";
import ParticipantModal from "@/components/ParticipantModal";
import RoundApprovalStatus from "@/components/RoundApprovalStatus";
import RoundCountdown from "@/components/RoundCountdown";
import TopBar from "@/components/TopBar";
import { createClient } from "@/lib/supabase/client";
import { getCurrentRound } from "@/lib/currentRound";
import { lockExpiredRounds } from "@/lib/lockExpiredRounds";

type Row = { userId: string; name: string; avatar: string; count: number };

type RawRoundParticipationRow = {
  user_id: string;
  total_points: number | null;
  users: { full_name: string; nickname: string | null; avatar: string | null } | null;
};

type SeasonStatsRow = {
  user_id: string;
  display_name: string;
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
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      await lockExpiredRounds(supabase);

      const round = await getCurrentRound(supabase);

      if (round) {
        setRoundNumber(round.round_number);

        const { data: rows } = await supabase
          .from("round_participation")
          .select("user_id, total_points, users(full_name, nickname, avatar)")
          .eq("round_id", round.id)
          .overrideTypes<RawRoundParticipationRow[], { merge: false }>();

        setCurrentRoundPoints(
          (rows ?? [])
            .map((r) => ({
              userId: r.user_id,
              name: r.users?.nickname ?? r.users?.full_name ?? "Unknown",
              avatar: r.users?.avatar ?? "🙂",
              count: r.total_points ?? 0,
            }))
            .sort((a, b) => b.count - a.count)
        );
      }

      const { data: stats } = await supabase
        .from("season_stats")
        .select("user_id, display_name, avatar, total_points, rounds_played")
        .overrideTypes<SeasonStatsRow[], { merge: false }>();

      const seasonRows = stats ?? [];
      setSeasonPoints(
        seasonRows
          .map((s) => ({
            userId: s.user_id,
            name: s.display_name,
            avatar: s.avatar ?? "🙂",
            count: s.total_points,
          }))
          .sort((a, b) => b.count - a.count)
      );
      setMostPlayed(
        seasonRows
          .map((s) => ({
            userId: s.user_id,
            name: s.display_name,
            avatar: s.avatar ?? "🙂",
            count: s.rounds_played,
          }))
          .sort((a, b) => b.count - a.count)
      );
    })();
  }, [supabase]);

  return (
    <main className="flex min-h-screen flex-col items-center gap-8 px-6 pb-24 pt-20">
      <TopBar />
      <NewsTicker />
      <RoundApprovalStatus />
      <RoundCountdown />
      <h1 className="text-lg font-medium text-ink">טבלת הליגה</h1>

      {roundNumber !== null && (
        <LeaderTable
          title={`נקודות מחזור ${roundNumber}`}
          rows={currentRoundPoints}
          countLabel="נק'"
          onSelect={setSelectedUserId}
        />
      )}
      <LeaderTable
        title="הכי הרבה נקודות (עונה)"
        rows={seasonPoints}
        countLabel="נק'"
        onSelect={setSelectedUserId}
      />
      <LeaderTable
        title="הכי הרבה השתתפויות"
        rows={mostPlayed}
        countLabel="מחזורים"
        onSelect={setSelectedUserId}
      />

      {selectedUserId && (
        <ParticipantModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
      )}

      <BottomNav />
    </main>
  );
}

function LeaderTable({
  title,
  rows,
  countLabel,
  onSelect,
}: {
  title: string;
  rows: Row[];
  countLabel: string;
  onSelect: (userId: string) => void;
}) {
  return (
    <section className="w-full max-w-md overflow-hidden rounded-[28px] bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_32px_-18px_rgba(0,0,0,0.28)]">
      <h2 className="px-5 pb-1 pt-5 text-sm font-semibold uppercase tracking-wide text-muted">
        {title}
      </h2>
      <div className="divide-y divide-neutral-100">
        {rows.map((r, i) => (
          <LeaderRow
            key={r.userId}
            rank={i + 1}
            avatar={r.avatar}
            name={r.name}
            count={r.count}
            countLabel={countLabel}
            onClick={() => onSelect(r.userId)}
          />
        ))}
      </div>
    </section>
  );
}
