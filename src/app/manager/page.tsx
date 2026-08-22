"use client";

import { useEffect, useState } from "react";
import LeaderRow from "@/components/LeaderRow";
import MatchResultsModal from "@/components/MatchResultsModal";
import NewsStripModal from "@/components/NewsStripModal";
import NewsTicker from "@/components/NewsTicker";
import ScoringRulesModal from "@/components/ScoringRulesModal";
import TopBar from "@/components/TopBar";
import { createClient } from "@/lib/supabase/client";
import { getCurrentRound } from "@/lib/currentRound";
import { lockExpiredRounds } from "@/lib/lockExpiredRounds";

type Participant = {
  participationId: string;
  name: string;
  avatar: string | null;
};

type RawParticipationRow = {
  id: string;
  payment_status: string;
  users: { full_name: string; nickname: string | null; avatar: string | null } | null;
};

type SeasonStatsRow = {
  user_id: string;
  display_name: string;
  avatar: string | null;
  rounds_played: number;
  rounds_won: number;
};

export default function ManagerDashboard() {
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roundId, setRoundId] = useState<string | null>(null);
  const [roundNumber, setRoundNumber] = useState<number | null>(null);
  const [waiting, setWaiting] = useState<Participant[]>([]);
  const [approved, setApproved] = useState<Participant[]>([]);
  const [seasonStats, setSeasonStats] = useState<SeasonStatsRow[]>([]);
  const [leaderTitle, setLeaderTitle] = useState<"played" | "winning">("played");
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [showScoringRules, setShowScoringRules] = useState(false);
  const [showNewsStrip, setShowNewsStrip] = useState(false);
  const [showMatchResults, setShowMatchResults] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: stats } = await supabase
        .from("season_stats")
        .select("user_id, display_name, avatar, rounds_played, rounds_won");
      setSeasonStats(stats ?? []);
    })();
  }, [supabase]);

  useEffect(() => {
    (async () => {
      await lockExpiredRounds(supabase);

      const round = await getCurrentRound(supabase);

      if (!round) {
        setError("אין עדיין אף מחזור.");
        setLoading(false);
        return;
      }

      setRoundId(round.id);
      setRoundNumber(round.round_number);

      const { data: rows, error: rowsError } = await supabase
        .from("round_participation")
        .select("id, payment_status, users(full_name, nickname, avatar)")
        .eq("round_id", round.id)
        .overrideTypes<RawParticipationRow[], { merge: false }>();

      if (rowsError) {
        setError(rowsError.message);
        setLoading(false);
        return;
      }

      const toParticipant = (row: RawParticipationRow): Participant => ({
        participationId: row.id,
        name: row.users?.nickname ?? row.users?.full_name ?? "לא ידוע",
        avatar: row.users?.avatar ?? null,
      });

      const all = rows ?? [];
      setWaiting(all.filter((r) => r.payment_status === "waiting").map(toParticipant));
      setApproved(all.filter((r) => r.payment_status === "approved").map(toParticipant));
      setLoading(false);
    })();
  }, [supabase]);

  async function setPaymentStatus(participationId: string, status: "waiting" | "approved") {
    const { error: updateError } = await supabase
      .from("round_participation")
      .update({ payment_status: status })
      .eq("id", participationId);
    setError(updateError ? updateError.message : null);
    return !updateError;
  }

  async function approve(person: Participant) {
    if (!(await setPaymentStatus(person.participationId, "approved"))) return;
    setWaiting((w) => w.filter((p) => p.participationId !== person.participationId));
    setApproved((a) => [...a, person]);
  }

  async function unapprove(person: Participant) {
    if (!(await setPaymentStatus(person.participationId, "waiting"))) return;
    setApproved((a) => a.filter((p) => p.participationId !== person.participationId));
    setWaiting((w) => [...w, person]);
  }

  function resetRound() {
    // Real reset (a fresh round + new fixtures) needs the manager
    // fixture-entry screen, which is still Phase 0 / on hold — so this
    // only clears the local view for now, it doesn't touch the database.
    setWaiting([]);
    setApproved([]);
    setConfirmingReset(false);
  }

  const leaderRows = [...seasonStats]
    .sort((a, b) =>
      leaderTitle === "played" ? b.rounds_played - a.rounds_played : b.rounds_won - a.rounds_won
    )
    .map((s) => ({
      name: s.display_name,
      avatar: s.avatar ?? "🙂",
      count: leaderTitle === "played" ? s.rounds_played : s.rounds_won,
    }));

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 pt-20 text-center">
        <TopBar href="/manager" rightAction={{ label: "חזרה למשחק", href: "/home" }} />
        <p className="text-sm text-muted">טוען...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-8 px-6 pb-10 pt-20">
      <TopBar href="/manager" rightAction={{ label: "חזרה למשחק", href: "/home" }} />
      <NewsTicker />
      <div>
        <span className="rounded bg-fuchsia-400 px-3 py-1 text-sm font-medium text-white">
          לוח ניהול
        </span>
      </div>

      <h1 className="text-lg font-semibold">
        {roundNumber ? `משתתפי מחזור ${roundNumber}` : "משתתפי המחזור"}
      </h1>

      {error && <p className="text-sm text-danger">{error}</p>}

      {roundId && (
        <div className="grid w-full max-w-2xl grid-cols-1 gap-8 sm:grid-cols-2">
          <NameList title="ממתינים לאישור" people={waiting} onAction={approve} actionLabel="אישור" />
          <NameList title="אושרו למחזור" people={approved} onAction={unapprove} actionLabel="המתנה" />
        </div>
      )}

      <section className="w-full max-w-md overflow-hidden rounded-[28px] bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_32px_-18px_rgba(0,0,0,0.28)]">
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            {leaderTitle === "played" ? "המשתתפים הכי פעילים" : "המשתתפים עם הכי הרבה ניצחונות"}
          </h2>
          <button
            onClick={() => setLeaderTitle((t) => (t === "played" ? "winning" : "played"))}
            className="text-xs text-muted underline"
          >
            החלפה ⇄
          </button>
        </div>
        <div className="divide-y divide-neutral-100">
          {leaderRows.map((r, i) => (
            <LeaderRow key={r.name} rank={i + 1} avatar={r.avatar} name={r.name} count={r.count} />
          ))}
        </div>
      </section>

      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={() => setShowMatchResults(true)}
          className="rounded-full border border-neutral-300 px-6 py-2 text-sm font-medium hover:bg-neutral-50"
        >
          תוצאות מחזור
        </button>
        <button
          onClick={() => setShowScoringRules(true)}
          className="rounded-full border border-neutral-300 px-6 py-2 text-sm font-medium hover:bg-neutral-50"
        >
          כללי ניקוד
        </button>
        <button
          onClick={() => setShowNewsStrip(true)}
          className="rounded-full border border-neutral-300 px-6 py-2 text-sm font-medium hover:bg-neutral-50"
        >
          רצועת חדשות
        </button>
        <button
          onClick={() => setConfirmingReset(true)}
          className="rounded-full border border-neutral-300 px-6 py-2 text-sm font-medium hover:bg-neutral-50"
        >
          איפוס מחזור
        </button>
      </div>

      {showScoringRules && <ScoringRulesModal onClose={() => setShowScoringRules(false)} />}
      {showNewsStrip && <NewsStripModal onClose={() => setShowNewsStrip(false)} />}
      {showMatchResults && <MatchResultsModal onClose={() => setShowMatchResults(false)} />}

      {confirmingReset && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-8 text-center shadow-lg">
            <p className="mb-6 text-xl font-semibold">
              בטוחים שאתם רוצים לאפס את המחזור?
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setConfirmingReset(false)}
                className="rounded-full bg-danger px-6 py-2 font-medium text-white hover:brightness-90"
              >
                חזרה
              </button>
              <button
                onClick={resetRound}
                className="rounded-full bg-brand px-6 py-2 font-medium text-white hover:bg-brand-dark"
              >
                כן
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function NameList({
  title,
  people,
  onAction,
  actionLabel,
}: {
  title: string;
  people: Participant[];
  onAction?: (person: Participant) => void;
  actionLabel?: string;
}) {
  return (
    <div>
      <h3 className="mb-2 text-center font-semibold">{title}</h3>
      <ol className="min-h-[10rem] space-y-1 rounded-xl border border-dashed border-neutral-300 p-4 text-sm">
        {people.length === 0 && <li className="text-muted">ריק</li>}
        {people.map((person, i) => (
          <li key={person.participationId} className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="text-muted">{i + 1}.</span>
              <span className="text-base">{person.avatar}</span>
              {person.name}
            </span>
            {onAction && (
              <button
                onClick={() => onAction(person)}
                className="text-xs text-brand underline"
              >
                {actionLabel}
              </button>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
