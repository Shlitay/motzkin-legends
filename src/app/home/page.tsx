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
import { lockExpiredRounds } from "@/lib/lockExpiredRounds";
import { currentUser, lastRoundStats, seasonStats } from "@/lib/mock-data";

type ProfileRow = { full_name: string; nickname: string | null; avatar: string | null };
type OpenRound = { id: string; round_number: number };

export default function HomePage() {
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [openRound, setOpenRound] = useState<OpenRound | null>(null);

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

      const [{ data: profileRow }, { data: roundRow }] = await Promise.all([
        supabase.from("users").select("full_name, nickname, avatar").eq("id", user.id).single(),
        supabase.from("rounds").select("id, round_number").eq("status", "open").single(),
      ]);

      setProfile(profileRow ?? null);
      setOpenRound(roundRow ?? null);
      setLoading(false);
    })();
  }, [supabase]);

  return (
    <main className="flex min-h-screen flex-col items-center gap-7 px-6 pb-24 pt-28">
      <TopBar />
      <NewsTicker />
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-3xl">
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

      {!loading && openRound && <RoundComments roundId={openRound.id} />}

      <BottomNav />
    </main>
  );
}
