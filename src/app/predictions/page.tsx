"use client";

import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import { ChevronIcon } from "@/components/icons";
import NewsTicker from "@/components/NewsTicker";
import RoundApprovalStatus from "@/components/RoundApprovalStatus";
import RoundCountdown from "@/components/RoundCountdown";
import SectionDivider from "@/components/SectionDivider";
import TopBar from "@/components/TopBar";
import EndedMatchWithParticipants from "@/components/predictions/EndedMatchWithParticipants";
import MatchRow from "@/components/predictions/MatchRow";
import { createClient } from "@/lib/supabase/client";
import { formatIsraelDeadline, israelDateKey } from "@/lib/israelTime";
import { lockExpiredRounds } from "@/lib/lockExpiredRounds";
import { matchStatus, type MatchStatus } from "@/lib/matchStatus";

type ScoreEntry = { home: string; away: string; pointsEarned: number | null };

type DbMatch = {
  id: string;
  home_team: string;
  away_team: string;
  kickoff_at: string;
  home_score: number | null;
  away_score: number | null;
  is_final: boolean;
  is_main_event: boolean;
};

type DbRound = {
  id: string;
  round_number: number;
  deadline_at: string;
  status: string;
  predictions_open_at: string | null;
};

type StandingsEntry = { userId: string; name: string; avatar: string };

type RawRoundParticipationRow = {
  user_id: string;
  rank: number | null;
  users: { full_name: string; nickname: string | null; avatar: string | null } | null;
};

const STATUS_ORDER: Record<MatchStatus, number> = { live: 0, "not-started": 1, ended: 2 };

export default function PredictionsPage() {
  const [supabase] = useState(() => createClient());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [rounds, setRounds] = useState<DbRound[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [matches, setMatches] = useState<DbMatch[]>([]);
  const [entries, setEntries] = useState<Record<string, ScoreEntry>>({});
  const [standingsOrder, setStandingsOrder] = useState<StandingsEntry[]>([]);
  const [now, setNow] = useState(() => new Date());

  // Drives the not-started -> live transition for whichever match's kickoff
  // just passed while this page is sitting open.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Load every round once; default to whichever one is 'open'.
  useEffect(() => {
    (async () => {
      await lockExpiredRounds(supabase);

      const { data, error: roundsError } = await supabase
        .from("rounds")
        .select("id, round_number, deadline_at, status, predictions_open_at")
        .order("round_number", { ascending: true });

      if (roundsError) {
        setError(roundsError.message);
        setLoading(false);
        return;
      }

      const roundList = data ?? [];
      setRounds(roundList);
      const openRound = roundList.find((r) => r.status === "open") ?? roundList[roundList.length - 1];
      if (openRound) {
        setSelectedRoundId(openRound.id);
      } else {
        setLoading(false);
      }
    })();
  }, [supabase]);

  // Whenever the selected round changes, load its matches + this user's
  // existing predictions for it.
  useEffect(() => {
    if (!selectedRoundId) return;
    setLoading(true);

    (async () => {
      const { data: matchRows, error: matchesError } = await supabase
        .from("matches")
        .select("id, home_team, away_team, kickoff_at, home_score, away_score, is_final, is_main_event")
        .eq("round_id", selectedRoundId)
        .order("kickoff_at");

      if (matchesError) {
        setError(matchesError.message);
        setLoading(false);
        return;
      }

      const matchList = matchRows ?? [];
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let predictionRows: {
        match_id: string;
        pred_home_score: number;
        pred_away_score: number;
        points_earned: number | null;
      }[] = [];
      if (user && matchList.length > 0) {
        const { data } = await supabase
          .from("predictions")
          .select("match_id, pred_home_score, pred_away_score, points_earned")
          .eq("user_id", user.id)
          .in("match_id", matchList.map((m) => m.id));
        predictionRows = data ?? [];
      }

      const byMatch = new Map(predictionRows.map((p) => [p.match_id, p]));
      const nextEntries: Record<string, ScoreEntry> = {};
      matchList.forEach((m) => {
        const existing = byMatch.get(m.id);
        nextEntries[m.id] = existing
          ? {
              home: String(existing.pred_home_score),
              away: String(existing.pred_away_score),
              pointsEarned: existing.points_earned,
            }
          : { home: "", away: "", pointsEarned: null };
      });

      setMatches(matchList);
      setEntries(nextEntries);
      setError(null);
      setLoading(false);
    })();
  }, [supabase, selectedRoundId]);

  // Current round standings order — fetched once per round (not once per
  // match expanded) so every locked match's "who predicted what" list can
  // share it. Same rank the round-points table on /leaderboard already
  // sorts by (recompute_round_standings()'s tiebreak chain), not raw
  // points, so the two stay consistent. RLS only returns rows once this
  // round is locked, matching per-day visibility (fix-predictions-visible-
  // per-day.sql) — before that, this list is just empty and no matches
  // are readOnly yet anyway, so nothing tries to render it.
  useEffect(() => {
    if (!selectedRoundId) return;

    (async () => {
      const { data } = await supabase
        .from("round_participation")
        .select("user_id, rank, users(full_name, nickname, avatar)")
        .eq("round_id", selectedRoundId)
        .overrideTypes<RawRoundParticipationRow[], { merge: false }>();

      setStandingsOrder(
        [...(data ?? [])]
          .sort((a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER))
          .map((r) => ({
            userId: r.user_id,
            name: r.users?.nickname ?? r.users?.full_name ?? "Unknown",
            avatar: r.users?.avatar ?? "🙂",
          }))
      );
    })();
  }, [supabase, selectedRoundId]);

  const selectedRound = rounds.find((r) => r.id === selectedRoundId) ?? null;
  const isOpenRound = selectedRound?.status === "open";

  // A round can accept payment/approval before predictions can actually be
  // submitted (house rule: predictions open Thursday 20:00 Israel time) —
  // null means no restriction, keeping rounds seeded without this column
  // set (or before this feature existed) working exactly as before.
  const predictionsOpen =
    !selectedRound?.predictions_open_at || now >= new Date(selectedRound.predictions_open_at);

  // rounds is already ordered by round_number ascending (the fetch query's
  // own sort), so adjacent array entries are adjacent rounds.
  const selectedRoundIndex = rounds.findIndex((r) => r.id === selectedRoundId);
  const previousRound = selectedRoundIndex > 0 ? rounds[selectedRoundIndex - 1] : null;
  const nextRound =
    selectedRoundIndex >= 0 && selectedRoundIndex < rounds.length - 1
      ? rounds[selectedRoundIndex + 1]
      : null;

  // A round's matches can span several days (see seed-round4.sql) — instead
  // of locking every match the moment the round's very first kickoff
  // passes, lock a whole calendar day together once *that day's own*
  // earliest kickoff passes, independent of the other days. A match is
  // still editable right up until its own day's first game starts, even if
  // an earlier day in the same round is already locked.
  const earliestKickoffByDay = new Map<string, number>();
  matches.forEach((m) => {
    const day = israelDateKey(m.kickoff_at);
    const t = new Date(m.kickoff_at).getTime();
    const earliest = earliestKickoffByDay.get(day);
    if (earliest === undefined || t < earliest) earliestKickoffByDay.set(day, t);
  });
  function isDayLocked(m: DbMatch) {
    const earliest = earliestKickoffByDay.get(israelDateKey(m.kickoff_at));
    return earliest !== undefined && now.getTime() >= earliest;
  }

  const editableMatches = matches.filter((m) => !isDayLocked(m));
  const allFilled =
    editableMatches.length > 0 &&
    editableMatches.every((m) => entries[m.id]?.home !== "" && entries[m.id]?.away !== "");

  // Live matches first, then upcoming, then ended — kickoff_at order (the
  // DB query's own sort) is preserved within each group since Array#sort
  // is stable. Ended matches are the exception: the ones that earned this
  // participant points come first, most points on top, then every
  // no-points match (0 or none) in kickoff order.
  const sortedMatches = [...matches].sort((a, b) => {
    const statusA = matchStatus(a.kickoff_at, a.is_final, now);
    const statusB = matchStatus(b.kickoff_at, b.is_final, now);
    if (statusA !== statusB) return STATUS_ORDER[statusA] - STATUS_ORDER[statusB];
    if (statusA !== "ended") return 0;

    const pointsA = entries[a.id]?.pointsEarned ?? 0;
    const pointsB = entries[b.id]?.pointsEarned ?? 0;
    if (pointsA > 0 || pointsB > 0) return pointsB - pointsA;
    return 0;
  });
  const firstEndedIndex = sortedMatches.findIndex(
    (m) => matchStatus(m.kickoff_at, m.is_final, now) === "ended"
  );

  function setScore(matchId: string, side: "home" | "away", value: string) {
    if (value !== "" && !/^\d$/.test(value)) return;
    setEntries((prev) => ({ ...prev, [matchId]: { ...prev[matchId], [side]: value } }));
  }

  async function sendPrediction() {
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("התנתקתם מהמערכת — יש להתחבר מחדש.");
      setSaving(false);
      return;
    }

    // Submitting predictions is itself proof of intent to play — register
    // the participant on the manager's approval list the same way
    // RoundApprovalStatus's "שלחתי כסף" button does, so that button is no
    // longer the only path onto that list. ignoreDuplicates means this only
    // ever creates the row; an existing waiting/approved/rejected status is
    // never touched.
    const { error: participationError } = await supabase
      .from("round_participation")
      .upsert(
        { user_id: user.id, round_id: selectedRoundId, payment_status: "waiting" },
        { onConflict: "user_id,round_id", ignoreDuplicates: true }
      );

    if (participationError) {
      setError(participationError.message);
      setSaving(false);
      return;
    }

    // Only the still-editable matches — never re-write a match whose day
    // already locked, since a never-predicted one would otherwise silently
    // get pred_home_score/pred_away_score written as 0-0 (Number("") is 0).
    const rows = editableMatches.map((m) => ({
      user_id: user.id,
      match_id: m.id,
      pred_home_score: Number(entries[m.id].home),
      pred_away_score: Number(entries[m.id].away),
    }));

    const { error: upsertError } = await supabase
      .from("predictions")
      .upsert(rows, { onConflict: "user_id,match_id" });

    if (upsertError) {
      setError(upsertError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 pt-20 text-center">
        <TopBar />
        <p className="text-sm text-muted">טוען...</p>
      </main>
    );
  }

  if (!selectedRound) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 pt-20 text-center">
        <TopBar />
        <p className="text-sm text-muted">אין עדיין מחזור פתוח.</p>
        <BottomNav />
      </main>
    );
  }

  const heading =
    editableMatches.length === 0
      ? "צפייה בניחושים שהגשתם"
      : !predictionsOpen
      ? "הגשת ניחושים עדיין לא נפתחה"
      : "הזינו את הניחושים למחזור";

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-6 pb-24 pt-20">
      <TopBar />
      <NewsTicker />
      <RoundApprovalStatus />
      <RoundCountdown />
      <div className="text-center">
        <h1 className="text-lg font-medium">{heading}</h1>
        <div className="mt-1 flex items-center justify-center gap-3">
          <button
            onClick={() => previousRound && setSelectedRoundId(previousRound.id)}
            disabled={!previousRound}
            aria-label="מחזור קודם"
            className="text-muted enabled:hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronIcon size={16} className="rotate-180" />
          </button>
          <p className="text-sm text-muted">
            מחזור {selectedRound.round_number} · ההגשה {isOpenRound ? "נסגרת" : "נסגרה"}{" "}
            {formatIsraelDeadline(selectedRound.deadline_at)}
          </p>
          <button
            onClick={() => nextRound && setSelectedRoundId(nextRound.id)}
            disabled={!nextRound}
            aria-label="מחזור הבא"
            className="text-muted enabled:hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronIcon size={16} />
          </button>
        </div>
      </div>

      {isOpenRound && !predictionsOpen && selectedRound.predictions_open_at && (
        <div className="w-full max-w-md rounded-2xl border border-draw/40 bg-draw/10 p-4 text-center text-sm font-medium text-draw">
          הגשת ניחושים למחזור {selectedRound.round_number} תיפתח ב-
          {formatIsraelDeadline(selectedRound.predictions_open_at)}. אפשר כבר עכשיו לשלוח תשלום
          דרך Paybox ולהמתין לאישור.
        </div>
      )}

      <div className="w-full max-w-md space-y-4">
        {sortedMatches.map((m, i) => {
          const e = entries[m.id];
          // Per-day locking, not round-wide: a round's status flips to
          // "locked" the moment its very first match anywhere kicks off,
          // so gating on isOpenRound here would lock every later day's
          // matches too the instant day 1 starts — isDayLocked(m) is the
          // real per-match gate (see its own comment above).
          const readOnly = !predictionsOpen || isDayLocked(m);
          const status = matchStatus(m.kickoff_at, m.is_final, now);
          return (
            <div key={m.id}>
              {i === firstEndedIndex && <SectionDivider label="משחקים שהסתיימו" />}
              {status !== "ended" ? (
                <MatchRow
                  matchId={m.id}
                  homeTeam={m.home_team}
                  awayTeam={m.away_team}
                  home={e.home}
                  away={e.away}
                  readOnly={readOnly}
                  onChangeHome={readOnly ? undefined : (v) => setScore(m.id, "home", v)}
                  onChangeAway={readOnly ? undefined : (v) => setScore(m.id, "away", v)}
                  finalHomeScore={m.home_score}
                  finalAwayScore={m.away_score}
                  status={status}
                  kickoffAt={m.kickoff_at}
                  isMainEvent={m.is_main_event}
                  standingsOrder={standingsOrder}
                />
              ) : (
                m.home_score !== null &&
                m.away_score !== null && (
                  <EndedMatchWithParticipants
                    matchId={m.id}
                    standingsOrder={standingsOrder}
                    homeTeam={m.home_team}
                    awayTeam={m.away_team}
                    predHome={Number(e.home)}
                    predAway={Number(e.away)}
                    actualHome={m.home_score}
                    actualAway={m.away_score}
                    points={e.pointsEarned}
                    isMainEvent={m.is_main_event}
                  />
                )
              )}
            </div>
          );
        })}
      </div>

      {predictionsOpen && editableMatches.length > 0 && (
        <button
          disabled={!allFilled || saving}
          onClick={sendPrediction}
          className="rounded-full bg-brand px-8 py-2 font-medium text-white enabled:hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-neutral-300"
        >
          {saving ? "שומר..." : allFilled ? "שמירת ניחושים" : "השלימו את הניחושים"}
        </button>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <BottomNav />
    </main>
  );
}
