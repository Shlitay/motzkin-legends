"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentRound } from "@/lib/currentRound";
import { createClient } from "@/lib/supabase/client";

// Scrolls /predictions to the first match still waiting for a prediction
// (cards mark themselves with data-needs-prediction).
export function scrollToNextUnpredicted() {
  const el = document.querySelector<HTMLElement>('[data-needs-prediction="true"]');
  if (!el) return false;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.querySelector<HTMLInputElement>("input:not(:disabled)")?.focus({ preventScroll: true });
  return true;
}

// Floating "time until the round starts" pill above the bottom nav
// (design/boards/PreRound + Countdown). Shown on every bottom-nav page until
// the round's first kickoff, then removed. HH:MM, hours may exceed 24.
export default function FloatingCountdown() {
  const pathname = usePathname();
  const router = useRouter();
  const [firstKickoff, setFirstKickoff] = useState<number | null>(null);
  // Nothing renders until firstKickoff loads on the client, so reading the
  // clock in the initializer can't cause a hydration mismatch.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const round = await getCurrentRound(supabase);
      if (!round) return;
      const { data } = await supabase
        .from("matches")
        .select("kickoff_at")
        .eq("round_id", round.id)
        .order("kickoff_at")
        .limit(1)
        .maybeSingle();
      setFirstKickoff(new Date(data?.kickoff_at ?? round.deadline_at).getTime());
    })();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(t);
  }, []);

  if (firstKickoff === null || now >= firstKickoff) return null;

  const totalMin = Math.ceil((firstKickoff - now) / 60_000);
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  const urgent = totalMin <= 60;

  function onClick() {
    if (pathname === "/predictions") scrollToNextUnpredicted();
    else router.push("/predictions?focus=next");
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`המחזור מתחיל בעוד ${hours} שעות ו־${minutes} דקות. מעבר למשחק הבא לניחוש`}
      className={
        // ::after widens the hit area to 48px without changing the look.
        "fixed bottom-[84px] left-4 z-40 flex h-10 items-center gap-[7px] rounded-full ps-[9px] pe-3 shadow-[0_7px_18px_rgba(11,42,23,.3)] after:absolute after:-inset-1 after:content-[''] " +
        (urgent ? "bg-gold border-[1.5px] border-[#8A6A12]" : "border-gold [--gold-fill:#123F24] [--gold-border:1.5px]")
      }
      dir="ltr"
    >
      <span
        className={
          "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full " +
          (urgent ? "bg-gold-ink text-[#FFE9A8]" : "bg-gold text-gold-ink")
        }
      >
        <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="13.5" r="7.5" />
          <path d="M12 9.5v4l2.5 1.6" />
          <path d="M9.5 2.5h5M12 2.5v3.5M18.6 6.4l1.4-1.4" />
        </svg>
      </span>
      <span className={"font-display text-[15px] font-bold tracking-[.02em] " + (urgent ? "text-gold-ink" : "text-chalk")}>
        {pad(hours)}:{pad(minutes)}
      </span>
    </button>
  );
}
