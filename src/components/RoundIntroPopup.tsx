"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCurrentRound } from "@/lib/currentRound";
import CloseButton from "@/components/CloseButton";

// One-time "new round" popup: shows the current round's intro_message
// (written by the manager in /manager -> "הודעת מחזור") once per
// participant per round. "Seen" is stored in round_intro_seen, not
// localStorage, so it doesn't pop up again on a second device. Skipped
// once the round is finished (it's still the "current" round until the
// next one is seeded, and its intro is stale by then). Any query error —
// e.g. add-round-intro-message.sql not run yet — just means no popup.
export default function RoundIntroPopup() {
  const [supabase] = useState(() => createClient());
  const router = useRouter();
  const pathname = usePathname();
  const [popup, setPopup] = useState<{ roundId: string; userId: string; message: string } | null>(
    null
  );

  useEffect(() => {
    (async () => {
      const [
        {
          data: { user },
        },
        round,
      ] = await Promise.all([supabase.auth.getUser(), getCurrentRound(supabase)]);
      if (!user || !round || round.status === "finished") return;

      const [{ data: roundRow }, { data: seen, error: seenError }] = await Promise.all([
        supabase.from("rounds").select("intro_message").eq("id", round.id).maybeSingle(),
        supabase
          .from("round_intro_seen")
          .select("round_id")
          .eq("round_id", round.id)
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      const message = roundRow?.intro_message?.trim();
      if (!message || seen || seenError) return;
      setPopup({ roundId: round.id, userId: user.id, message });
    })();
  }, [supabase]);

  if (!popup) return null;

  async function dismiss(goToPredictions: boolean) {
    if (!popup) return;
    setPopup(null);
    await supabase
      .from("round_intro_seen")
      .upsert(
        { user_id: popup.userId, round_id: popup.roundId },
        { onConflict: "user_id,round_id", ignoreDuplicates: true }
      );
    if (goToPredictions && pathname !== "/predictions") router.push("/predictions");
  }

  // First line is the greeting/title, the rest is the body.
  const [title, ...body] = popup.message.split("\n");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <div className="relative w-full max-w-sm">
        <CloseButton onClick={() => dismiss(false)} />
        <div className="rounded-2xl bg-white p-8 text-center shadow-lg">
          <h2 className="mb-4 text-xl font-semibold">{title}</h2>
          {body.length > 0 && (
            <p className="mb-8 whitespace-pre-line text-sm leading-relaxed text-ink">
              {body.join("\n").trim()}
            </p>
          )}
          <button
            onClick={() => dismiss(true)}
            className="rounded-full bg-brand px-6 py-2 font-medium text-white hover:bg-brand-dark"
          >
            לניחושים
          </button>
        </div>
      </div>
    </div>
  );
}
