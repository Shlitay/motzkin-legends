"use client";

import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import { ChevronIcon } from "@/components/icons";
import { ENTRY_FEE_ILS } from "@/components/JackpotBadge";
import LeaderRow, { statColumnClass } from "@/components/LeaderRow";
import NewsTicker from "@/components/NewsTicker";
import ParticipantModal from "@/components/ParticipantModal";
import RoundApprovalStatus from "@/components/RoundApprovalStatus";
import RoundCountdown from "@/components/RoundCountdown";
import TopBar from "@/components/TopBar";
import { createClient } from "@/lib/supabase/client";
import { lockExpiredRounds } from "@/lib/lockExpiredRounds";
import { matchStatus, type MatchStatus } from "@/lib/matchStatus";

// values line up with the owning LeaderTable's columnLabels, one per column.
// exactCount/towardsCount are only ever set on the round-points table's
// rows (see LeaderRow) — the season table already shows its own hits/
// towards as plain columns via `values`, so it leaves these undefined.
// rankChange is also round-table-only — see its own comment below.
type Row = {
  userId: string;
  name: string;
  avatar: string;
  values: number[];
  exactCount?: number;
  towardsCount?: number;
  rankChange?: "up" | "down";
};

type DbRound = { id: string; round_number: number; deadline_at: string; status: string };

type RoundMatch = { id: string; kickoff_at: string; is_final: boolean };

type RawRoundParticipationRow = {
  user_id: string;
  total_points: number | null;
  exact_score_count: number | null;
  correct_result_count: number | null;
  rank: number | null;
  previous_rank: number | null;
  payment_status: string;
  users: { full_name: string; nickname: string | null; avatar: string | null } | null;
};

type ApprovedParticipant = { userId: string; name: string; avatar: string };

type SeasonStatsRow = {
  user_id: string;
  display_name: string;
  avatar: string | null;
  total_points: number;
  rounds_played: number;
  season_hits: number;
  season_towards: number;
};

export default function LeaderboardPage() {
  const [supabase] = useState(() => createClient());

  // Round switcher — same pattern as /predictions: fetch every round once,
  // default to whichever one is 'open' (or the latest if none is), and let
  // prev/next browse the rest. Lets participants look back at any past
  // round's table, winner, and pot — not just whichever is current.
  const [rounds, setRounds] = useState<DbRound[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);

  const [roundMatches, setRoundMatches] = useState<RoundMatch[]>([]);
  const [now, setNow] = useState(() => new Date());
  const [roundPoints, setRoundPoints] = useState<Row[]>([]);
  const [approvedParticipants, setApprovedParticipants] = useState<ApprovedParticipant[]>([]);
  const [pastParticipantCount, setPastParticipantCount] = useState<number | null>(null);
  const [seasonPoints, setSeasonPoints] = useState<Row[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Drives the not-started -> live transition in the round match-status
  // summary if this page is left open across a match's kickoff.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Load every round once; default to whichever one is 'open'. Season
  // stats (independent of round selection) load here too.
  useEffect(() => {
    (async () => {
      await lockExpiredRounds(supabase);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);

      const { data } = await supabase
        .from("rounds")
        .select("id, round_number, deadline_at, status")
        .order("round_number", { ascending: true });

      const roundList = data ?? [];
      setRounds(roundList);
      const openRound = roundList.find((r) => r.status === "open") ?? roundList[roundList.length - 1];
      if (openRound) setSelectedRoundId(openRound.id);

      const { data: stats } = await supabase
        .from("season_stats")
        .select("user_id, display_name, avatar, total_points, rounds_played, season_hits, season_towards")
        .overrideTypes<SeasonStatsRow[], { merge: false }>();

      const seasonRows = stats ?? [];
      // Season table columns, in display order: hits, towards, rounds
      // played, total points (last = primary stat, and the sort key).
      // Users who never played a round (signed up, never approved) are
      // left out entirely rather than listed with all zeros.
      setSeasonPoints(
        seasonRows
          .filter((s) => s.rounds_played > 0)
          .map((s) => ({
            userId: s.user_id,
            name: s.display_name,
            avatar: s.avatar ?? "🙂",
            values: [s.season_hits, s.season_towards, s.rounds_played, s.total_points],
          }))
          .sort((a, b) => b.values[3] - a.values[3])
      );
    })();
  }, [supabase]);

  // Whenever the selected round changes, load its matches + standings.
  useEffect(() => {
    if (!selectedRoundId) return;

    (async () => {
      const { data: matchRows } = await supabase
        .from("matches")
        .select("id, kickoff_at, is_final")
        .eq("round_id", selectedRoundId);
      setRoundMatches(matchRows ?? []);

      const { data: rows } = await supabase
        .from("round_participation")
        .select(
          "user_id, total_points, exact_score_count, correct_result_count, rank, previous_rank, payment_status, users(full_name, nickname, avatar)"
        )
        .eq("round_id", selectedRoundId)
        .overrideTypes<RawRoundParticipationRow[], { merge: false }>();

      // Before a round starts there's nothing to rank yet (no matches
      // played) — showing who's actually approved to play is the useful
      // thing instead. Same underlying rows as roundPoints below, just
      // filtered + without any points/rank fields that would all be 0.
      setApprovedParticipants(
        (rows ?? [])
          .filter((r) => r.payment_status === "approved")
          .map((r) => ({
            userId: r.user_id,
            name: r.users?.nickname ?? r.users?.full_name ?? "Unknown",
            avatar: r.users?.avatar ?? "🙂",
          }))
      );

      setRoundPoints(
        [...(rows ?? [])]
          // Sorting by the DB's own rank (not raw points) is what
          // actually applies the tiebreak chain (points -> exact hits ->
          // who predicted first) — recompute_round_standings() already
          // computed it server-side; sorting by points alone here would
          // silently undo that for anyone tied on points.
          .sort((a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER))
          .map((r) => ({
            userId: r.user_id,
            name: r.users?.nickname ?? r.users?.full_name ?? "Unknown",
            avatar: r.users?.avatar ?? "🙂",
            values: [r.total_points ?? 0],
            exactCount: r.exact_score_count ?? 0,
            towardsCount: r.correct_result_count ?? 0,
            // A lower rank number is better — moving from 4th to 2nd is
            // "up" even though 2 < 4. previous_rank is snapshotted
            // server-side inside recompute_round_standings() itself (see
            // add-rank-movement-tracking.sql), so this reflects the real
            // last goal/result event, not just "changed since I last
            // loaded the page" — correct even for someone opening the
            // page for the first time after it happened.
            rankChange:
              r.rank !== null && r.previous_rank !== null && r.rank !== r.previous_rank
                ? r.rank < r.previous_rank
                  ? "up"
                  : "down"
                : undefined,
          }))
      );

      // For the winner's payout badge once the round is finished — the pot
      // is participant-count × entry fee. Deliberately NOT a live count of
      // payment_status = 'approved': /manager's "reset approved
      // participants" action sets payment_status back to 'waiting' for an
      // already-finished round to prep the next one's signups, which would
      // silently zero out a past round's pot the same way it broke
      // season_stats.rounds_played (see fix-season-stats-rounds-played-v2.sql).
      // Uses a security-definer RPC (round_participant_count, same
      // mechanism as is_manager()) rather than querying `predictions`
      // directly — a direct client query is fully RLS-bound to the
      // *viewer's own* current approval status for that round, which the
      // reset action can just as easily have broken.
      const { data: participantCount } = await supabase.rpc("round_participant_count", {
        p_round_id: selectedRoundId,
      });
      setPastParticipantCount(participantCount ?? 0);
    })();
  }, [supabase, selectedRoundId]);

  const selectedRound = rounds.find((r) => r.id === selectedRoundId) ?? null;

  // rounds is already ordered by round_number ascending (the fetch query's
  // own sort), so adjacent array entries are adjacent rounds.
  const selectedRoundIndex = rounds.findIndex((r) => r.id === selectedRoundId);
  const previousRound = selectedRoundIndex > 0 ? rounds[selectedRoundIndex - 1] : null;
  const nextRound =
    selectedRoundIndex >= 0 && selectedRoundIndex < rounds.length - 1
      ? rounds[selectedRoundIndex + 1]
      : null;

  // The winner takes the pot minus one entry fee — second place gets their
  // own buy-in refunded rather than it going to the winner. Only shown
  // once every match in the selected round is done (status === "finished"),
  // matching the crown badge itself — works the same for a past round as
  // for the current one.
  const isRoundFinished = selectedRound?.status === "finished";
  const winnerPayout =
    isRoundFinished && pastParticipantCount !== null
      ? pastParticipantCount * ENTRY_FEE_ILS - ENTRY_FEE_ILS
      : null;

  return (
    <main className="flex min-h-screen flex-col items-center gap-[22.4px] px-6 pb-24 pt-20">
      <TopBar />
      <NewsTicker />
      <RoundApprovalStatus />
      <RoundCountdown />
      <h1 className="text-lg font-medium text-ink">טבלת הליגה</h1>

      {selectedRound && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => previousRound && setSelectedRoundId(previousRound.id)}
            disabled={!previousRound}
            aria-label="מחזור קודם"
            className="text-muted enabled:hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronIcon size={16} className="rotate-180" />
          </button>
          <p className="text-sm text-muted">מחזור {selectedRound.round_number}</p>
          <button
            onClick={() => nextRound && setSelectedRoundId(nextRound.id)}
            disabled={!nextRound}
            aria-label="מחזור הבא"
            className="text-muted enabled:hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronIcon size={16} />
          </button>
        </div>
      )}

      {selectedRound && selectedRound.status === "open" && (
        <LeaderTable
          title={`משתתפים מאושרים — מחזור ${selectedRound.round_number}`}
          rows={approvedParticipants.map((p) => ({ ...p, values: [] }))}
          columnLabels={[]}
          onSelect={setSelectedUserId}
          currentUserId={currentUserId}
          maxHeightPx={420}
        />
      )}

      {selectedRound && selectedRound.status !== "open" && (
        <RoundMatchSummary matches={roundMatches} now={now} />
      )}

      {selectedRound && selectedRound.status !== "open" && (
        <LeaderTable
          title={`נקודות מחזור ${selectedRound.round_number}`}
          rows={roundPoints}
          columnLabels={["נק'"]}
          onSelect={setSelectedUserId}
          winnerJackpotLabel={winnerPayout !== null ? `זכה בקופה: ${winnerPayout} ₪` : undefined}
          currentUserId={currentUserId}
          showRankChange={selectedRound.status === "locked"}
          maxHeightPx={420}
        />
      )}
      <div className="flex w-full max-w-md flex-col items-center gap-3">
        <h2 className="text-base font-medium text-ink">סטטיסטיקות עונה</h2>
        <LeaderTable
          rows={seasonPoints}
          columnLabels={["פגיעה", "כיוון", "מחזורים", "נק'"]}
          onSelect={setSelectedUserId}
          hideAvatars
          currentUserId={currentUserId}
          maxHeightPx={520}
        />
      </div>

      {selectedUserId && (
        <ParticipantModal
          userId={selectedUserId}
          round={selectedRound}
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
  columnLabels,
  onSelect,
  winnerJackpotLabel,
  maxHeightPx,
  hideAvatars,
  currentUserId,
  showRankChange = false,
}: {
  // Omit for a table whose heading lives outside the card (season table) —
  // the header row then holds just the column labels, pushed to the end.
  title?: string;
  rows: Row[];
  // One header per numeric column, matching each Row's values order.
  columnLabels: string[];
  onSelect: (userId: string) => void;
  // Only ever passed for the round-points table, once that round is
  // finished — applied to rows[0], which is already the actual rank-1
  // winner (rows arrives pre-sorted by the DB's own tiebroken rank).
  winnerJackpotLabel?: string;
  // Every table is capped + internally scrollable now, with the header
  // sticky at the top of that same scroll box (not the page) — avoids
  // the header ever overlapping unrelated page content, which an
  // earlier page-relative `sticky top-N` version did. 520px (season,
  // no-avatar 48px rows + ~40px header, exactly 10 visible) vs 420px (round-points, 60px rows
  // with avatars, ~7 visible) — tuned per table's own row height.
  maxHeightPx: number;
  // Season table only — rows show just rank + name + stats.
  hideAvatars?: boolean;
  // Highlights whichever row's userId matches — lets a participant spot
  // their own place at a glance, on both tables. Null while logged out or
  // not yet loaded, in which case no row is highlighted.
  currentUserId: string | null;
  // Round-points table only, and only while the round is actually
  // 'locked' (live, in progress) — once 'finished', nothing can move
  // again, so there's nothing left to indicate. Also gated to the top 3
  // rows only, inside the rows.map below.
  showRankChange?: boolean;
}) {
  return (
    <section className="w-full max-w-md overflow-hidden rounded-[28px] bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_32px_-18px_rgba(0,0,0,0.28)]">
      <div className="overflow-y-auto" style={{ maxHeight: maxHeightPx }}>
        <div className="sticky top-0 z-10 flex items-baseline justify-between gap-3 bg-surface px-5 pb-1 pt-5">
          {title && <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>}
          <span
            className={`ms-auto flex shrink-0 font-medium uppercase tracking-wide text-muted ${
              columnLabels.length > 1 ? "gap-2 text-[11px]" : "gap-4 text-xs"
            }`}
          >
            {columnLabels.map((label) => (
              <span key={label} className={statColumnClass(columnLabels.length)}>
                {label}
              </span>
            ))}
          </span>
        </div>
        <div className="divide-y divide-neutral-100">
          {rows.map((r, i) => (
            <LeaderRow
              key={r.userId}
              rank={i + 1}
              avatar={r.avatar}
              hideAvatar={hideAvatars}
              name={r.name}
              values={r.values}
              onClick={() => onSelect(r.userId)}
              crown={i === 0 && !!winnerJackpotLabel}
              jackpotLabel={i === 0 ? winnerJackpotLabel : undefined}
              exactCount={r.exactCount}
              towardsCount={r.towardsCount}
              isCurrentUser={r.userId === currentUserId}
              rankChange={showRankChange && i < 3 ? r.rankChange : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
