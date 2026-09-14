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
  round_number: number | null;
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

      // "Last round" card: while currentRound is still 'open' (not
      // started), show the most recent round the user actually played
      // *before* it — currentRound itself may already have a real
      // round_participation row despite having barely started (predictions
      // open immediately and submitting one auto-creates that row — see
      // /predictions' sendPrediction()), so a no-filter highest-round pick
      // would show that near-empty round instead of the previous, fully-
      // played one. But once currentRound has actually started (status
      // 'locked'/'finished'), it IS the relevant round to show — the user
      // explicitly wants live in-progress stats for the round underway,
      // not the prior finished one. Round status never reaches 'finished'
      // in the SQL for a round still being played, so this only reads
      // 'open' vs "already started" here.
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

      const lastParticipation = (allParticipation ?? [])
        .filter((p) => {
          if (currentRound == null) return true;
          const roundNumber = p.rounds?.round_number ?? Infinity;
          return currentRound.status === "open"
            ? roundNumber < currentRound.round_number
            : roundNumber <= currentRound.round_number;
        })
        .sort((a, b) => (b.rounds?.round_number ?? -1) - (a.rounds?.round_number ?? -1))[0];
      setLastRound(
        lastParticipation
          ? { ...lastParticipation, round_number: lastParticipation.rounds?.round_number ?? null }
          : null
      );

      setLoading(false);
    })();
  }, [supabase]);

  // Live only while the shown round IS the round currently in view and
  // that round hasn't finished yet — a fallback to an earlier, already-
  // finished round (round not started yet, or user has no row for it)
  // is always "previous", never "live".
  const lastRoundIsLive =
    !!lastRound?.round_number &&
    round != null &&
    lastRound.round_number === round.round_number &&
    round.status === "locked";
  const lastRoundTitle = !lastRound?.round_number
    ? "מחזור אחרון"
    : lastRoundIsLive
      ? `מחזור חי נוכחי (מחזור ${lastRound.round_number})`
      : `מחזור קודם (מחזור ${lastRound.round_number})`;

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
        title={lastRoundTitle}
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
