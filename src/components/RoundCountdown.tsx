"use client";

import { useEffect, useState } from "react";
import { getCurrentRound, type CurrentRound } from "@/lib/currentRound";
import { formatIsraelDeadline } from "@/lib/israelTime";
import { createClient } from "@/lib/supabase/client";

function getRemaining(diffMs: number) {
  if (diffMs <= 0) return null;

  const totalSeconds = Math.floor(diffMs / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

export default function RoundCountdown() {
  const [supabase] = useState(() => createClient());
  const [round, setRound] = useState<CurrentRound | null>(null);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      setRound(await getCurrentRound(supabase));
    })();
  }, [supabase]);

  useEffect(() => {
    // Countdown math is plain epoch-millisecond subtraction — always
    // correct regardless of the viewer's own device timezone. Only the
    // *displayed* kickoff clock time below needs the explicit Israel-time
    // conversion (formatIsraelDeadline), since that's a wall-clock reading.
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!round || now === null) return null;

  const remaining = getRemaining(new Date(round.deadline_at).getTime() - now);
  if (!remaining) return null;

  return (
    <section className="w-full max-w-md rounded-2xl border border-neutral-200 bg-surface p-5 text-center">
      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        ההגשה למחזור {round.round_number} נסגרת בעוד
      </p>

      {/* Countdown digits read left-to-right (DD-HH-MM-SS) by convention,
          same as a stopwatch — pinned to LTR regardless of the page's RTL
          direction, same fix as the "1X2" logo mark. */}
      <div className="flex items-center justify-center gap-3" dir="ltr">
        <TimeUnit value={remaining.days} label="ימים" />
        <TimeUnit value={remaining.hours} label="שעות" />
        <TimeUnit value={remaining.minutes} label="דקות" />
        <TimeUnit value={remaining.seconds} label="שניות" />
      </div>

      <p className="mt-3 text-xs text-muted">
        נעילה ב-{formatIsraelDeadline(round.deadline_at)}
      </p>
    </section>
  );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="font-display flex h-11 w-11 items-center justify-center rounded-lg bg-ink text-lg font-semibold tabular-nums text-white">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted">{label}</span>
    </div>
  );
}
