"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCurrentRound } from "@/lib/currentRound";
import CloseButton from "@/components/CloseButton";

export type RoundPopupConfig = {
  title: string | null;
  body: string | null;
  main_color: string;
  bg_color: string;
  show_once: boolean;
};

// "New round" popup, configured once by the manager in /manager ->
// "הודעת מחזור" (the round_popup singleton) and re-triggered for every
// new round automatically. show_once: seen once per participant per
// round, stored in round_intro_seen (not localStorage) so a second device
// doesn't show it again. Otherwise: once per browser session, as long as
// the round runs. Skipped once the round is finished (it's still the
// "current" round until the next one is seeded). Any query error — e.g.
// the migration not run yet — just means no popup.
export default function RoundIntroPopup() {
  const [supabase] = useState(() => createClient());
  const router = useRouter();
  const pathname = usePathname();
  const [popup, setPopup] = useState<{
    roundId: string;
    userId: string;
    config: RoundPopupConfig;
  } | null>(null);

  useEffect(() => {
    (async () => {
      const [
        {
          data: { user },
        },
        round,
        { data: config },
      ] = await Promise.all([
        supabase.auth.getUser(),
        getCurrentRound(supabase),
        supabase
          .from("round_popup")
          .select("title, body, main_color, bg_color, show_once")
          .eq("id", 1)
          .maybeSingle(),
      ]);
      if (!user || !round || round.status === "finished" || !config) return;
      if (!config.title?.trim() && !config.body?.trim()) return;

      if (config.show_once) {
        const { data: seen, error: seenError } = await supabase
          .from("round_intro_seen")
          .select("round_id")
          .eq("round_id", round.id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (seen || seenError) return;
      } else if (sessionSeen(round.id)) {
        return;
      }

      setPopup({ roundId: round.id, userId: user.id, config });
    })();
  }, [supabase]);

  if (!popup) return null;

  async function dismiss(goToPredictions: boolean) {
    if (!popup) return;
    setPopup(null);
    if (popup.config.show_once) {
      await supabase
        .from("round_intro_seen")
        .upsert(
          { user_id: popup.userId, round_id: popup.roundId },
          { onConflict: "user_id,round_id", ignoreDuplicates: true }
        );
    } else {
      markSessionSeen(popup.roundId);
    }
    if (goToPredictions && pathname !== "/predictions") router.push("/predictions");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <RoundPopupCard
        config={popup.config}
        onClose={() => dismiss(false)}
        onAction={() => dismiss(true)}
      />
    </div>
  );
}

// Shared with the manager editor's live preview.
export function RoundPopupCard({
  config,
  onClose,
  onAction,
}: {
  config: RoundPopupConfig;
  onClose?: () => void;
  onAction?: () => void;
}) {
  return (
    <div className="relative w-full max-w-sm">
      {onClose && <CloseButton onClick={onClose} />}
      <div
        className="rounded-2xl p-8 text-center shadow-lg"
        style={{ backgroundColor: config.bg_color, color: config.main_color }}
      >
        {config.title?.trim() && <h2 className="mb-4 text-xl font-semibold">{config.title}</h2>}
        {config.body?.trim() && (
          <p className="mb-8 whitespace-pre-line text-sm leading-relaxed">{config.body.trim()}</p>
        )}
        <button
          onClick={onAction}
          className="rounded-full px-6 py-2 font-medium hover:opacity-90"
          style={{ backgroundColor: config.main_color, color: config.bg_color }}
        >
          לניחושים
        </button>
      </div>
    </div>
  );
}

const sessionKey = (roundId: string) => `round-popup-seen:${roundId}`;

function sessionSeen(roundId: string) {
  try {
    return sessionStorage.getItem(sessionKey(roundId)) === "1";
  } catch {
    return false;
  }
}

function markSessionSeen(roundId: string) {
  try {
    sessionStorage.setItem(sessionKey(roundId), "1");
  } catch {}
}
