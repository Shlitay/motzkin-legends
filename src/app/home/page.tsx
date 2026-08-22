"use client";

import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import NewsTicker from "@/components/NewsTicker";
import RoundApprovalStatus from "@/components/RoundApprovalStatus";
import RoundComments from "@/components/RoundComments";
import RoundCountdown from "@/components/RoundCountdown";
import StatCard from "@/components/StatCard";
import TopBar from "@/components/TopBar";
import { createClient } from "@/lib/supabase/client";
import { getCurrentRound, type CurrentRound } from "@/lib/currentRound";
import { lockExpiredRounds } from "@/lib/lockExpiredRounds";
import { currentUser, lastRoundStats, seasonStats } from "@/lib/mock-data";

type ProfileRow = { full_name: string; nickname: string | null; avatar: string | null };

export default function HomePage() {
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [round, setRound] = useState<CurrentRound | null>(null);

  useEffect(() => {
    (async () => {
      await lockExpiredRounds(supabase);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const [{ data: profileRow }, currentRound] = await Promise.all([
        supabase.from("users").select("full_name, nickname, avatar").eq("id", user.id).single(),
        getCurrentRound(supabase),
      ]);

      setProfile(profileRow ?? null);
      setRound(currentRound);
      setLoading(false);
    })();
  }, [supabase]);

  return (
    <main className="flex min-h-screen flex-col items-center gap-4 px-6 pb-24 pt-20">
      <TopBar />
      <NewsTicker />
      <div className="flex flex-col items-center gap-1">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-2xl">
          {profile?.avatar ?? currentUser.avatar}
        </div>
        <p className="font-medium text-ink">
          {profile?.nickname ?? profile?.full_name ?? currentUser.fullName}
        </p>
      </div>

      <RoundApprovalStatus />
      <RoundCountdown />

      <StatCard
        title="מחזור אחרון"
        headline={`מקום: ${lastRoundStats.place}`}
        towards={lastRoundStats.towards}
        points={lastRoundStats.points}
        hit={lastRoundStats.hit}
      />

      <StatCard
        title="כל העונה"
        headline={`סה"כ השתתפויות: ${seasonStats.totalParticipation}`}
        towards={seasonStats.towards}
        points={seasonStats.points}
        hit={seasonStats.hit}
      />

      {!loading && round && <RoundComments roundId={round.id} />}

      <BottomNav />
    </main>
  );
}
