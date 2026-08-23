"use client";

import { useEffect, useState } from "react";
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

export default function ManagerDashboard() {
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roundId, setRoundId] = useState<string | null>(null);
  const [roundNumber, setRoundNumber] = useState<number | null>(null);
  const [waiting, setWaiting] = useState<Participant[]>([]);
  const [approved, setApproved] = useState<Participant[]>([]);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [showScoringRules, setShowScoringRules] = useState(false);
  const [showNewsStrip, setShowNewsStrip] = useState(false);
  const [showMatchResults, setShowMatchResults] = useState(false);

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

      <div className="grid w-full max-w-md grid-cols-2 gap-4">
        <ManagerActionButton onClick={() => setShowMatchResults(true)}>תוצאות מחזור</ManagerActionButton>
        <ManagerActionButton onClick={() => setShowScoringRules(true)}>כללי ניקוד</ManagerActionButton>
        <ManagerActionButton onClick={() => setShowNewsStrip(true)}>רצועת חדשות</ManagerActionButton>
        <ManagerActionButton onClick={() => setConfirmingReset(true)}>איפוס מחזור</ManagerActionButton>
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

function ManagerActionButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex aspect-square flex-col items-center justify-center rounded-2xl border border-neutral-300 bg-surface p-4 text-center text-base font-semibold shadow-sm hover:bg-neutral-50"
    >
      {children}
    </button>
  );
}
