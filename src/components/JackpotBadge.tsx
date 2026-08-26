"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentRound } from "@/lib/currentRound";

// Entry fee per participant, in NIS. Not manager-configurable — hardcoded
// since that's what was asked for; worth revisiting if the buy-in ever
// changes or needs to vary by round. Exported so /rules can state it
// alongside the payout rules without duplicating the number.
export const ENTRY_FEE_ILS = 20;

export default function JackpotBadge() {
  const [supabase] = useState(() => createClient());
  const [amount, setAmount] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const round = await getCurrentRound(supabase);
      if (!round) return;

      const { count } = await supabase
        .from("round_participation")
        .select("id", { count: "exact", head: true })
        .eq("round_id", round.id)
        .eq("payment_status", "approved");

      if (count !== null) setAmount(count * ENTRY_FEE_ILS);
    })();
  }, [supabase]);

  if (amount === null) return null;

  return (
    <span className="shine-badge whitespace-nowrap rounded-full border border-[#8a6a1a]/40 px-4 py-2 text-sm font-extrabold text-white shadow [text-shadow:0_1px_2px_rgba(0,0,0,0.35)] [background:linear-gradient(135deg,#f6e6ab_0%,#d9b74a_35%,#c9a227_65%,#a8811f_100%)]">
      קופה: {amount} ₪
    </span>
  );
}
