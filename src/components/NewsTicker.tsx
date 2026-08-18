"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const SEPARATOR = "   •   ";

export default function NewsTicker() {
  const [supabase] = useState(() => createClient());
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("news_strip")
        .select("slot_1, slot_2, slot_3")
        .eq("id", 1)
        .maybeSingle();

      if (!data) return;

      const items = [data.slot_1, data.slot_2, data.slot_3].filter(
        (s): s is string => !!s && s.trim() !== ""
      );

      if (items.length > 0) setText(items.join(SEPARATOR));
    })();
  }, [supabase]);

  if (!text) return null;

  return (
    <div className="w-full overflow-hidden border-y border-neutral-200 bg-legend/15 py-1.5">
      <div className="animate-marquee flex w-max whitespace-nowrap text-sm font-medium text-legend-contrast">
        <span className="px-4">{text}</span>
        <span className="px-4">{text}</span>
      </div>
    </div>
  );
}
