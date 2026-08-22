"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const SEPARATOR = "   •   ";

export default function NewsTicker() {
  const [supabase] = useState(() => createClient());
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: strip }, { data: round }] = await Promise.all([
        supabase.from("news_strip").select("slot_1, slot_2, slot_3").eq("id", 1).maybeSingle(),
        supabase.from("rounds").select("id, round_number").eq("status", "open").single(),
      ]);

      const items = [strip?.slot_1, strip?.slot_2, strip?.slot_3].filter(
        (s): s is string => !!s && s.trim() !== ""
      );

      // Item 4 is fully automatic — not a manager-editable slot — the count
      // of approved participants for whichever round is currently open.
      if (round) {
        const { count } = await supabase
          .from("round_participation")
          .select("id", { count: "exact", head: true })
          .eq("round_id", round.id)
          .eq("payment_status", "approved");

        if (count !== null) {
          items.push(`כרגע יש ${count} משתתפים מאושרים למחזור ${round.round_number}`);
        }
      }

      // Trailing separator too, so the wrap-around point (where the two
      // duplicated copies meet) reads exactly like every other item
      // boundary — otherwise the loop has a visible seam.
      if (items.length > 0) setText(items.join(SEPARATOR) + SEPARATOR);
    })();
  }, [supabase]);

  if (!text) return null;

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
        <span>{text}</span>
        <span>{text}</span>
      </div>
    </div>
  );
}
