"use client";

import { useEffect, useState } from "react";
import { ENTRY_FEE_ILS } from "@/components/JackpotBadge";
import { getCurrentRound, type CurrentRound } from "@/lib/currentRound";
import { createClient } from "@/lib/supabase/client";

export const PAYBOX_GROUP_LINK = "https://links.payboxapp.com/61FepCDmZ7b";

// Fired after a player confirms payment themselves (PaymentPrompt), so the
// chip and the notice reload their status without a page refresh.
export const PARTICIPATION_CHANGED = "participation-changed";

type ParticipationStatus = "waiting" | "approved" | "rejected" | null;

function useParticipation() {
  const [state, setState] = useState<{ round: CurrentRound; status: ParticipationStatus; started: boolean } | null>(null);

  const [version, setVersion] = useState(0);

  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    window.addEventListener(PARTICIPATION_CHANGED, bump);
    return () => window.removeEventListener(PARTICIPATION_CHANGED, bump);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const round = await getCurrentRound(supabase);
      if (!round) return;
      const { data } = await supabase
        .from("round_participation")
        .select("payment_status")
        .eq("user_id", user.id)
        .eq("round_id", round.id)
        .maybeSingle();
      setState({
        round,
        status: data?.payment_status ?? null,
        // First kickoff passed (deadline_at = the round's first kickoff).
        started: Date.now() >= new Date(round.deadline_at).getTime(),
      });
    })();
  }, [version]);

  return state;
}

const checkIcon = (
  <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

// Small status chip next to the round title on /predictions.
export function ApprovalChip() {
  const p = useParticipation();
  if (!p || p.round.status !== "open") return null;

  if (p.status === "approved") {
    return (
      <span className="inline-flex items-center gap-[5px] rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-[#14512D]">
        {checkIcon}
        ההשתתפות אושרה
      </span>
    );
  }
  if (p.status === "waiting") {
    return (
      <span className="inline-flex items-center gap-[5px] rounded-full bg-cream px-2.5 py-1 text-xs font-bold text-[#6E5200]">
        ממתין לאישור
      </span>
    );
  }
  return null;
}

function PayboxLink() {
  return (
    <a
      href={PAYBOX_GROUP_LINK}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-10 items-center justify-center rounded-xl bg-pitch-800 px-4 text-sm font-bold text-chalk hover:bg-pitch-900"
    >
      תשלום ₪{ENTRY_FEE_ILS}‏ בפייבוקס
    </a>
  );
}

// Payment / approval notice for the current round. The Paybox link stays
// until the round's first kickoff — also for approved players (owner's call,
// 2026-11-12) — and after that only for players not approved yet.
export default function RoundApprovalStatus() {
  const p = useParticipation();
  if (!p || p.round.status !== "open") return null;
  if (p.status === "approved" && p.started) return null;

  if (p.status === "rejected") {
    return (
      <section className="w-full max-w-md rounded-2xl border border-[#F0C9C5] bg-[#FDF1F0] p-4 text-sm font-semibold text-danger">
        לא אושרתם למחזור {p.round.round_number}. פנו למנהל אם זו טעות.
      </section>
    );
  }

  return (
    <section className="flex w-full max-w-md flex-col gap-3 rounded-2xl border border-[#EAD9A6] bg-cream p-4">
      <div className="flex flex-col gap-1">
        <span className="text-[15px] font-extrabold text-ink">
          {p.status === "approved"
            ? "ההשתתפות שלכם אושרה ✓"
            : p.status === "waiting"
            ? "ממתינים לאישור התשלום"
            : `רוצים להשתתף במחזור ${p.round.round_number}?`}
        </span>
        <span className="text-[13px] text-[#6E5200]">
          {p.status === "approved"
            ? "קישור התשלום בפייבוקס נשאר כאן עד שהמחזור מתחיל."
            : p.status === "waiting"
            ? "כבר שלחתם? אשרו כאן ותיכנסו מיד. עוד לא? הקישור לפייבוקס כאן."
            : `שולחים ‎${ENTRY_FEE_ILS} ש״ח בפייבוקס ונכנסים לקופה.`}
        </span>
      </div>
      <PayboxLink />
      {p.status === "waiting" && <ConfirmPaidButton roundId={p.round.id} />}
    </section>
  );
}

// "I already sent": approves the caller right away (confirm_my_payment in
// add-self-confirm-payment.sql). The manager sees who confirmed themselves.
export function useConfirmPaid(roundId: string, onDone?: (status: string | null) => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    const { data, error: rpcError } = await createClient().rpc("confirm_my_payment", { p_round_id: roundId });
    setBusy(false);
    if (rpcError) {
      setError("משהו השתבש, נסו שוב.");
      return false;
    }
    window.dispatchEvent(new Event(PARTICIPATION_CHANGED));
    onDone?.((data as string | null) ?? null);
    return true;
  }

  return { confirm, busy, error };
}

export function ConfirmPaidButton({ roundId, onDone }: { roundId: string; onDone?: (status: string | null) => void }) {
  const { confirm, busy, error } = useConfirmPaid(roundId, onDone);

  return (
    <>
      <button
        type="button"
        onClick={confirm}
        disabled={busy}
        className="inline-flex min-h-10 items-center justify-center rounded-xl border-[1.5px] border-pitch-600 bg-white px-4 text-sm font-bold text-pitch-800 disabled:opacity-60"
      >
        {busy ? "מאשר..." : "כבר שלחתי ✓"}
      </button>
      {error && <span className="text-center text-xs font-semibold text-danger">{error}</span>}
    </>
  );
}
