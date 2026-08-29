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
import { currentUser } from "@/lib/mock-data";

type ProfileRow = { full_name: string; nickname: string | null; avatar: string | null };

type SeasonRow = {
  rounds_played: number;
  total_points: number;
  season_hits: number;
  season_towards: number;
};

type LastRoundRow = {
  rank: number | null;
  total_points: number | null;
  exact_score_count: number | null;
  correct_result_count: number | null;
};

export default function HomePage() {
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [round, setRound] = useState<CurrentRound | null>(null);
  const [season, setSeason] = useState<SeasonRow | null>(null);
  const [lastRound, setLastRound] = useState<LastRoundRow | null>(null);

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

      const [{ data: profileRow }, currentRound, { data: seasonRow }] = await Promise.all([
        supabase.from("users").select("full_name, nickname, avatar").eq("id", user.id).single(),
        getCurrentRound(supabase),
        supabase
          .from("season_stats")
          .select("rounds_played, total_points, season_hits, season_towards")
          .eq("user_id", user.id)
          .single(),
      ]);

      setProfile(profileRow ?? null);
      setRound(currentRound);
      setSeason(seasonRow ?? null);

      // "Last round" = the round this user most recently actually
      // participated in — not currentRound, which is the newest round
      // overall and may be one the user hasn't played yet (e.g. it just
      // opened for predictions). Round status never transitions to
      // 'finished' in the SQL, so status can't be used to find it either.
      //
      // Sorted client-side, not via .order(..., { foreignTable }) — that
      // option only reorders rows *nested inside* an embed, it does NOT
      // reorder the outer query by a related table's column (confirmed
      // against postgrest-js's own source/docs). The previous version of
      // this query silently returned rows in unspecified order.
      const { data: allParticipation } = await supabase
        .from("round_participation")
        .select("rank, total_points, exact_score_count, correct_result_count, rounds(round_number)")
        .eq("user_id", user.id)
        .overrideTypes<
          {
            rank: number | null;
            total_points: number | null;
            exact_score_count: number | null;
            correct_result_count: number | null;
            rounds: { round_number: number } | null;
          }[],
          { merge: false }
        >();

      const lastParticipation = (allParticipation ?? []).sort(
        (a, b) => (b.rounds?.round_number ?? -1) - (a.rounds?.round_number ?? -1)
      )[0];
      setLastRound(lastParticipation ?? null);

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
        headline={`מקום: ${lastRound?.rank ?? 0}`}
        towards={lastRound?.correct_result_count ?? 0}
        points={lastRound?.total_points ?? 0}
        hit={lastRound?.exact_score_count ?? 0}
      />

      <StatCard
        title="כל העונה"
        headline={`סה"כ השתתפויות: ${season?.rounds_played ?? 0}`}
        towards={season?.season_towards ?? 0}
        points={season?.total_points ?? 0}
        hit={season?.season_hits ?? 0}
      />

      {!loading && round && <RoundComments roundId={round.id} />}

      <BottomNav />
    </main>
  );
}
