"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentRound } from "@/lib/currentRound";
import { ENTRY_FEE_ILS } from "@/components/JackpotBadge";

const SEPARATOR = "   •   ";

type WinnerRow = {
  users: { full_name: string | null; nickname: string | null } | null;
};

// Every item is automatic, computed from live data — no manager-editable
// slots (the old news_strip table + /manager "רצועת חדשות" modal were
// replaced 2026-10-28; the table itself is left in place, just unread).
export default function NewsTicker() {
  const [supabase] = useState(() => createClient());
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const [round, { data: lastFinished }] = await Promise.all([
        getCurrentRound(supabase),
        supabase
          .from("rounds")
          .select("id, round_number")
          .eq("status", "finished")
          .order("round_number", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const next: string[] = [];

      // 1. Approved participants for the current round.
      if (round) {
        const { count } = await supabase
          .from("round_participation")
          .select("id", { count: "exact", head: true })
          .eq("round_id", round.id)
          .eq("payment_status", "approved");

        if (count !== null) {
          next.push(`כרגע יש ${count} משתתפים מאושרים למחזור ${round.round_number}`);
        }
      }

      // 2. Last finished round's winner + payout. Same rules as
      // /leaderboard's crown badge: rank 1 by the DB's own tiebroken rank,
      // pot = round_participant_count (security-definer, immune to the
      // "reset approved participants" action) × entry fee, minus one entry
      // fee refunded to 2nd place.
      if (lastFinished) {
        const [{ data: winner }, { data: participantCount }] = await Promise.all([
          supabase
            .from("round_participation")
            .select("users(full_name, nickname)")
            .eq("round_id", lastFinished.id)
            .eq("rank", 1)
            .limit(1)
            .maybeSingle()
            .overrideTypes<WinnerRow, { merge: false }>(),
          supabase.rpc("round_participant_count", { p_round_id: lastFinished.id }),
        ]);

        const name = winner?.users?.nickname ?? winner?.users?.full_name;
        if (name && participantCount) {
          const payout = participantCount * ENTRY_FEE_ILS - ENTRY_FEE_ILS;
          next.push(`${name} זכה בקופה של מחזור ${lastFinished.round_number} – ${payout} ₪`);
        }
      }

      // 3. Match count for the current round.
      if (round) {
        const { count } = await supabase
          .from("matches")
          .select("id", { count: "exact", head: true })
          .eq("round_id", round.id);

        if (count) next.push(`במחזור ${round.round_number} יש ${count} משחקים`);
      }

      setItems(next);
    })();
  }, [supabase]);

  if (items.length === 0) return null;

  // Each item is its own dir="rtl" span, which bidi-isolates it: a
  // winner's Latin-script nickname or a trailing digit can't reorder or
  // squish against the neighboring separator (the older single-string
  // version needed a trailing RLM per digit-ending item for this). The
  // trailing separator makes the wrap-around point (where the two
  // duplicated copies meet) read like every other item boundary.
  const strip = (
    <span>
      {items.map((item, i) => (
        <span key={i}>
          <span dir="rtl">{item}</span>
          {SEPARATOR}
        </span>
      ))}
    </span>
  );

  return (
    // dir="ltr" is required, not stylistic: under the page's global RTL, a
    // flex row's "natural" resting position anchors its *right* edge to the
    // container and only extends leftward — translating it further left
    // (the standard duplicate-content marquee trick) then just shrinks the
    // visible content into a growing blank gap instead of revealing new
    // content, since there's nothing further right to slide into view.
    // Forcing LTR here restores the normal anchor-left/extend-right
    // geometry the translateX(-50%) loop assumes, without affecting how
    // the Hebrew text itself renders (RTL character runs still shape
    // correctly regardless of the container's base direction).
    <div className="w-full overflow-hidden border-y border-neutral-200 bg-legend/15 py-1.5" dir="ltr">
      <div className="animate-marquee flex w-max whitespace-nowrap text-sm font-medium text-legend-contrast">
        {strip}
        {strip}
      </div>
    </div>
  );
}
