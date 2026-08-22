"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Entry fee per participant, in NIS. Not manager-configurable — hardcoded
// since that's what was asked for; worth revisiting if the buy-in ever
// changes or needs to vary by round.
const ENTRY_FEE_ILS = 20;

export default function JackpotBadge() {
  const [supabase] = useState(() => createClient());
  const [amount, setAmount] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data: round } = await supabase
        .from("rounds")
        .select("id")
        .eq("status", "open")
        .single();

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
    <span className="whitespace-nowrap rounded-full border border-legend/40 bg-legend/15 px-3 py-1.5 text-xs font-semibold text-legend-contrast">
      קופה: {amount} ₪
    </span>
  );
}
