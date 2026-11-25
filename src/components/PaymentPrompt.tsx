"use client";

import { ENTRY_FEE_ILS } from "@/components/JackpotBadge";
import { ConfirmPaidButton, PAYBOX_GROUP_LINK } from "@/components/RoundApprovalStatus";

// Shown once per round, right after a player's first predictions of that
// round are saved while their participation is still waiting (owner's
// request, 2026-11-25). Two ways out: pay in Paybox now, or "I already sent",
// which approves them right away (confirm_my_payment). The popup stays open
// after the Paybox link so they can come back and tap "I already sent".
export default function PaymentPrompt({
  roundId,
  roundNumber,
  onClose,
}: {
  roundId: string;
  roundNumber: number;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(11,42,23,.55)] sm:items-center" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-title"
        onClick={(e) => e.stopPropagation()}
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

        <a
          href={PAYBOX_GROUP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-gold flex h-[52px] items-center justify-center gap-2 rounded-[14px] text-base font-black text-gold-ink"
        >
          שליחת ₪{ENTRY_FEE_ILS}‏ בפייבוקס עכשיו
        </a>

        <ConfirmPaidButton roundId={roundId} onDone={onClose} />

        <button type="button" onClick={onClose} className="min-h-10 text-sm font-bold text-muted underline">
          אחר כך
        </button>
      </section>
    </div>
  );
}
