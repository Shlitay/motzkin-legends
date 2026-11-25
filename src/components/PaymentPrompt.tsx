"use client";

import { ENTRY_FEE_ILS } from "@/components/JackpotBadge";
import { PAYBOX_GROUP_LINK, useConfirmPaid } from "@/components/RoundApprovalStatus";

// Shown once per round, right after a player's first predictions of that
// round are saved while their participation is still waiting (owner's
// request, 2026-11-25). Exactly two ways out, and both approve the player
// right away (confirm_my_payment): pay in Paybox now (the link opens and the
// approval runs alongside it), or "I already sent". No "later" and no
// closing by tapping outside (owner's call, 2026-11-25).
export default function PaymentPrompt({
  roundId,
  roundNumber,
  onClose,
}: {
  roundId: string;
  roundNumber: number;
  onClose: () => void;
}) {
  const { confirm, busy, error } = useConfirmPaid(roundId, () => onClose());

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(11,42,23,.55)] sm:items-center">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-title"
        className="flex w-full max-w-md flex-col gap-4 rounded-t-[26px] bg-chalk px-5 pb-5 pt-6 shadow-[0_-10px_30px_rgba(0,0,0,.25)] sm:rounded-[26px]"
      >
        <div className="flex flex-col gap-1">
          <h2 id="payment-title" className="text-xl font-black leading-tight">
            הניחושים נשמרו! עכשיו התשלום
          </h2>
          <p className="text-[14px] leading-relaxed text-[#2E3A32]">
            כדי להשתתף במחזור {roundNumber} ולהיכנס לקופה, שלחו ‎{ENTRY_FEE_ILS} ש״ח בקבוצת הפייבוקס.
          </p>
        </div>

        {/* A real link, so the browser opens Paybox from the tap itself (no
            popup blocker); the approval runs in the background. */}
        <a
          href={PAYBOX_GROUP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            void confirm();
          }}
          aria-disabled={busy}
          className="bg-gold flex h-[52px] items-center justify-center gap-2 rounded-[14px] text-base font-black text-gold-ink"
        >
          שליחת ₪{ENTRY_FEE_ILS}‏ בפייבוקס עכשיו
        </a>

        <button
          type="button"
          onClick={() => void confirm()}
          disabled={busy}
          className="flex h-[52px] items-center justify-center rounded-[14px] border-[1.5px] border-pitch-600 bg-white text-base font-extrabold text-pitch-800 disabled:opacity-60"
        >
          {busy ? "מאשר..." : "כבר שלחתי ✓"}
        </button>

        {error && <span className="text-center text-xs font-semibold text-danger">{error}</span>}
      </section>
    </div>
  );
}
