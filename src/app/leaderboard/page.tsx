"use client";

import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import { ENTRY_FEE_ILS } from "@/components/JackpotBadge";
import LeaderRow from "@/components/LeaderRow";
import NewsTicker from "@/components/NewsTicker";
import ParticipantModal from "@/components/ParticipantModal";
import RoundApprovalStatus from "@/components/RoundApprovalStatus";
import RoundCountdown from "@/components/RoundCountdown";
import TopBar from "@/components/TopBar";
import { createClient } from "@/lib/supabase/client";
import { getCurrentRound, type CurrentRound } from "@/lib/currentRound";
import { lockExpiredRounds } from "@/lib/lockExpiredRounds";
import { matchStatus, type MatchStatus } from "@/lib/matchStatus";

type Row = { userId: string; name: string; avatar: string; count: number };

type RoundMatch = { id: string; kickoff_at: string; is_final: boolean };

type RawRoundParticipationRow = {
  user_id: string;
  total_points: number | null;
  rank: number | null;
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
  const [round, setRound] = useState<CurrentRound | null>(null);
  const [roundMatches, setRoundMatches] = useState<RoundMatch[]>([]);
  const [now, setNow] = useState(() => new Date());
  const [currentRoundPoints, setCurrentRoundPoints] = useState<Row[]>([]);
  const [approvedCount, setApprovedCount] = useState<number | null>(null);
  const [seasonPoints, setSeasonPoints] = useState<Row[]>([]);
  const [mostPlayed, setMostPlayed] = useState<Row[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Drives the not-started -> live transition in the round match-status
  // summary if this page is left open across a match's kickoff.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    (async () => {
      await lockExpiredRounds(supabase);

      const currentRound = await getCurrentRound(supabase);
      setRound(currentRound);

      if (currentRound) {
        const { data: matchRows } = await supabase
          .from("matches")
          .select("id, kickoff_at, is_final")
          .eq("round_id", currentRound.id);
        setRoundMatches(matchRows ?? []);

        const { data: rows } = await supabase
          .from("round_participation")
          .select("user_id, total_points, rank, users(full_name, nickname, avatar)")
          .eq("round_id", currentRound.id)
          .overrideTypes<RawRoundParticipationRow[], { merge: false }>();

        setCurrentRoundPoints(
          [...(rows ?? [])]
            // Sorting by the DB's own rank (not raw points) is what
            // actually applies the tiebreak chain (points -> exact hits
            // -> who predicted first) — recompute_round_standings()
            // already computed it server-side; sorting by points alone
            // here would silently undo that for anyone tied on points.
            .sort((a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER))
            .map((r) => ({
              userId: r.user_id,
              name: r.users?.nickname ?? r.users?.full_name ?? "Unknown",
              avatar: r.users?.avatar ?? "🙂",
              count: r.total_points ?? 0,
            }))
        );

        // For the winner's payout badge once the round is finished — the
        // pot is approved-participant-count × entry fee, same definition
        // TopBar's JackpotBadge uses.
        const { count } = await supabase
          .from("round_participation")
          .select("id", { count: "exact", head: true })
          .eq("round_id", currentRound.id)
          .eq("payment_status", "approved");
        setApprovedCount(count);
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

  // The winner takes the pot minus one entry fee — second place gets their
  // own buy-in refunded rather than it going to the winner. Only shown
  // once every match in the round is done (round.status === "finished"),
  // matching the crown badge itself.
  const isRoundFinished = round?.status === "finished";
  const winnerPayout =
    isRoundFinished && approvedCount !== null ? approvedCount * ENTRY_FEE_ILS - ENTRY_FEE_ILS : null;

  return (
    <main className="flex min-h-screen flex-col items-center gap-[22.4px] px-6 pb-24 pt-20">
      <TopBar />
      <NewsTicker />
      <RoundApprovalStatus />
      <RoundCountdown />
      <h1 className="text-lg font-medium text-ink">טבלת הליגה</h1>

      {round && round.status !== "open" && (
        <RoundMatchSummary matches={roundMatches} now={now} />
      )}

      {round && (
        <LeaderTable
          title={`נקודות מחזור ${round.round_number}`}
          rows={currentRoundPoints}
          countLabel="נק'"
          onSelect={setSelectedUserId}
          winnerJackpotLabel={winnerPayout !== null ? `זכה בקופה: ${winnerPayout} ₪` : undefined}
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
        <ParticipantModal
          userId={selectedUserId}
          round={round}
          onClose={() => setSelectedUserId(null)}
        />
      )}

      <BottomNav />
    </main>
  );
}

function RoundMatchSummary({ matches, now }: { matches: RoundMatch[]; now: Date }) {
  const counts: Record<MatchStatus, number> = { "not-started": 0, live: 0, ended: 0 };
  matches.forEach((m) => {
    counts[matchStatus(m.kickoff_at, m.is_final, now)]++;
  });

  const items: { status: MatchStatus; label: string; dot: string; bg: string; text: string }[] = [
    { status: "ended", label: "הסתיימו", dot: "bg-draw", bg: "bg-draw/10", text: "text-draw" },
    { status: "live", label: "בשידור חי", dot: "bg-brand animate-pulse", bg: "bg-brand/10", text: "text-brand" },
    { status: "not-started", label: "טרם החלו", dot: "bg-neutral-400", bg: "bg-neutral-100", text: "text-neutral-500" },
  ];

  return (
    <div className="flex w-full max-w-md flex-wrap items-center justify-center gap-2">
      {items.map((it) => (
        <span
          key={it.status}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${it.bg} ${it.text}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${it.dot}`} />
          {counts[it.status]} {it.label}
        </span>
      ))}
    </div>
  );
}

function LeaderTable({
  title,
  rows,
  countLabel,
  onSelect,
  winnerJackpotLabel,
}: {
  title: string;
  rows: Row[];
  countLabel: string;
  onSelect: (userId: string) => void;
  // Only ever passed for the current round's points table, once that
  // round is finished — applied to rows[0], which is already the actual
  // rank-1 winner (rows arrives pre-sorted by the DB's own tiebroken rank).
  winnerJackpotLabel?: string;
}) {
  return (
    <section className="w-full max-w-md overflow-hidden rounded-[28px] bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_32px_-18px_rgba(0,0,0,0.28)]">
      <div className="flex items-baseline justify-between gap-3 px-5 pb-1 pt-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
        <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted">
          {countLabel}
        </span>
      </div>
      <div className="divide-y divide-neutral-100">
        {rows.map((r, i) => (
          <LeaderRow
            key={r.userId}
            rank={i + 1}
            avatar={r.avatar}
            name={r.name}
            count={r.count}
            onClick={() => onSelect(r.userId)}
            crown={i === 0 && !!winnerJackpotLabel}
            jackpotLabel={i === 0 ? winnerJackpotLabel : undefined}
          />
        ))}
      </div>
    </section>
  );
}
