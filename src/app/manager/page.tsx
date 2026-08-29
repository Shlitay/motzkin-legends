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
  userId: string;
  name: string;
  avatar: string | null;
};

type RawParticipationRow = {
  id: string;
  user_id: string;
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
        .select("id, user_id, payment_status, users(full_name, nickname, avatar)")
        .eq("round_id", round.id)
        .overrideTypes<RawParticipationRow[], { merge: false }>();

      if (rowsError) {
        setError(rowsError.message);
        setLoading(false);
        return;
      }

      const toParticipant = (row: RawParticipationRow): Participant => ({
        participationId: row.id,
        userId: row.user_id,
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

    // Backfills a default prediction (from the participant's own saved
    // default score) for any match in this round whose kickoff has
    // already passed and that they still have no prediction for, then
    // recomputes standings — covers approving someone after the round
    // has already locked, which the one-time lock_expired_rounds() fill
    // never revisits. Harmless no-op for an on-time approval.
    if (roundId) {
      const { error: backfillError } = await supabase.rpc("backfill_late_approval", {
        p_round_id: roundId,
        p_user_id: person.userId,
      });
      if (backfillError) setError(backfillError.message);
    }
  }

  async function unapprove(person: Participant) {
    if (!(await setPaymentStatus(person.participationId, "waiting"))) return;
    setApproved((a) => a.filter((p) => p.participationId !== person.participationId));
    setWaiting((w) => [...w, person]);
  }

  // Deletes the round_participation row entirely (rather than setting
  // payment_status to 'rejected'), so the participant lands back on the
  // "send money to Paybox" screen instead of the "you weren't approved"
  // one — for the case where they clicked "money sent" without actually
  // paying, and should just start over.
  async function removeFromWaiting(person: Participant) {
    const { error: deleteError } = await supabase
      .from("round_participation")
      .delete()
      .eq("id", person.participationId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setWaiting((w) => w.filter((p) => p.participationId !== person.participationId));
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
          <NameList
            title="ממתינים לאישור"
            people={waiting}
            onAction={approve}
            actionLabel="אישור"
            onSecondaryAction={removeFromWaiting}
            secondaryActionLabel="הסרה"
          />
          <NameList title="אושרו למחזור" people={approved} onAction={unapprove} actionLabel="המתנה" />
        </div>
      )}

      <div className="grid w-full max-w-md grid-cols-2 gap-4">
        <ManagerActionButton onClick={() => setShowMatchResults(true)}>תוצאות מחזור</ManagerActionButton>
        <ManagerActionButton onClick={() => setShowScoringRules(true)}>כללי ניקוד</ManagerActionButton>
        <ManagerActionButton onClick={() => setShowNewsStrip(true)}>רצועת חדשות</ManagerActionButton>
      </div>

      {showScoringRules && <ScoringRulesModal onClose={() => setShowScoringRules(false)} />}
      {showNewsStrip && <NewsStripModal onClose={() => setShowNewsStrip(false)} />}
      {showMatchResults && <MatchResultsModal onClose={() => setShowMatchResults(false)} />}
    </main>
  );
}

function NameList({
  title,
  people,
  onAction,
  actionLabel,
  onSecondaryAction,
  secondaryActionLabel,
}: {
  title: string;
  people: Participant[];
  onAction?: (person: Participant) => void;
  actionLabel?: string;
  onSecondaryAction?: (person: Participant) => void;
  secondaryActionLabel?: string;
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
            <span className="flex items-center gap-3">
              {onAction && (
                <button
                  onClick={() => onAction(person)}
                  className="text-xs text-brand underline"
                >
                  {actionLabel}
                </button>
              )}
              {onSecondaryAction && (
                <button
                  onClick={() => onSecondaryAction(person)}
                  className="text-xs text-danger underline"
                >
                  {secondaryActionLabel}
                </button>
              )}
            </span>
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
