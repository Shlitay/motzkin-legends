"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentRound } from "@/lib/currentRound";

// Entry fee per participant, in NIS. Not manager-configurable — hardcoded
// since that's what was asked for; worth revisiting if the buy-in ever
// changes or needs to vary by round. Exported so /rules can state it
// alongside the payout rules without duplicating the number.
export const ENTRY_FEE_ILS = 30;

export default function JackpotBadge() {
  const [supabase] = useState(() => createClient());
  const [amount, setAmount] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const round = await getCurrentRound(supabase);
      if (!round) return;

      // Once every match in the round is done, the pot's already been paid
      // out to the winner (see the crown/payout badge on /leaderboard) —
      // keep showing the old total here would look like there's still
      // money sitting in the pot.
      if (round.status === "finished") {
        setAmount(0);
        return;
      }

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
    <span className="shine-badge bg-gold whitespace-nowrap rounded-full px-2.5 py-[5px] text-xs font-bold text-gold-ink">
      {/* Trailing RLM keeps the ₪ next to the number in the RTL layout. */}
      קופה ₪{amount}‏
    </span>
  );
}
