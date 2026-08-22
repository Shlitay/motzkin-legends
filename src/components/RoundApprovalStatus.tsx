"use client";

import { useEffect, useState } from "react";
import { CheckCircleIcon, ClockIcon } from "@/components/icons";
import { getCurrentRound, type CurrentRound } from "@/lib/currentRound";
import { createClient } from "@/lib/supabase/client";

type ParticipationStatus = "waiting" | "approved" | "rejected" | null;

export default function RoundApprovalStatus() {
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [round, setRound] = useState<CurrentRound | null>(null);
  const [status, setStatus] = useState<ParticipationStatus>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const currentRound = await getCurrentRound(supabase);
      setRound(currentRound);

      if (currentRound) {
        const { data: participation } = await supabase
          .from("round_participation")
          .select("payment_status")
          .eq("user_id", user.id)
          .eq("round_id", currentRound.id)
          .maybeSingle();
        setStatus(participation?.payment_status ?? null);
      }

      setLoading(false);
    })();
  }, [supabase]);

  async function requestApproval() {
    if (!round) return;
    setRequesting(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("התנתקתם מהמערכת — יש להתחבר מחדש.");
      setRequesting(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("round_participation")
      .insert({ user_id: user.id, round_id: round.id, payment_status: "waiting" });

    if (insertError) {
      setError(insertError.message);
      setRequesting(false);
      return;
    }

    setStatus("waiting");
    setRequesting(false);
  }

  if (loading || !round) return null;

  const cardClass =
    status === "approved"
      ? "border-brand/30 bg-brand/10"
      : status === "waiting"
      ? "border-draw/40 bg-draw/10"
      : "border-neutral-200 bg-surface";

  return (
    <section className={`w-full max-w-md rounded-2xl border p-5 text-center ${cardClass}`}>
      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        מחזור {round.round_number} אושר
      </p>

      {status === "approved" && (
        <p className="flex items-center justify-center gap-2 text-sm font-medium text-brand">
          <CheckCircleIcon size={18} />
          אושרתם לשחק במחזור הזה.
        </p>
      )}

      {status === "waiting" && (
        <p className="flex items-center justify-center gap-2 text-sm font-medium text-draw">
          <ClockIcon size={18} />
          הבקשה נשלחה — ממתינים לאישור התשלום מהמנהל.
        </p>
      )}

      {status === "rejected" && (
        <p className="text-sm text-danger">
          לא אושרתם למחזור הזה. פנו למנהל אם זו טעות.
        </p>
      )}

      {status === null && (
        <>
          <p className="mb-3 text-sm text-muted">
            שלחו את התשלום דרך Paybox, ואז לחצו למטה כדי לעדכן את המנהל.
          </p>
          <button
            disabled={requesting}
            onClick={requestApproval}
            className="rounded-full bg-brand px-6 py-2 text-sm font-medium text-white enabled:hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            {requesting ? "שולח..." : "שלחתי תשלום דרך Paybox"}
          </button>
        </>
      )}

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </section>
  );
}
