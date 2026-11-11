"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCurrentRound } from "@/lib/currentRound";
import { TEAM_LOGOS, shortTeamName } from "@/lib/constants";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(11,42,23,.62)] px-[18px]">
      <RoundPopupCard
        config={popup.config}
        onClose={() => dismiss(false)}
        onAction={() => dismiss(true)}
      />
    </div>
  );
}

// Current round number + its main match, for the popup's banner and the
// gold "המשחק המרכזי" strip. Shared by the real popup and the manager preview.
function useRoundContext() {
  const [ctx, setCtx] = useState<{ roundNumber: number; main: { home: string; away: string } | null } | null>(null);
  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const round = await getCurrentRound(supabase);
      if (!round) return;
      const { data } = await supabase
        .from("matches")
        .select("home_team, away_team")
        .eq("round_id", round.id)
        .eq("is_main_event", true)
        .limit(1)
        .maybeSingle();
      setCtx({ roundNumber: round.round_number, main: data ? { home: data.home_team, away: data.away_team } : null });
    })();
  }, []);
  return ctx;
}

function Crest({ team }: { team: string }) {
  const src = TEAM_LOGOS[team];
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt="" className="h-7 w-7 shrink-0 object-contain" /> : null;
}

// design/boards/RoundIntro.dc.html. Always brand colors — round_popup's
// main_color/bg_color are no longer used (design/HANDOFF.md §8).
export function RoundPopupCard({
  config,
  onClose,
  onAction,
}: {
  config: RoundPopupConfig;
  onClose?: () => void;
  onAction?: () => void;
}) {
  const ctx = useRoundContext();
  const roundLabel = ctx ? `מחזור ${ctx.roundNumber}` : "מחזור חדש";

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-label={`${roundLabel} נפתח`}
      className="border-gold relative max-h-[calc(100vh-48px)] w-full max-w-sm overflow-y-auto rounded-[26px] shadow-[0_24px_60px_rgba(0,0,0,.45)]"
    >
      <div className="relative flex flex-col items-center gap-3 overflow-hidden bg-pitch-800 px-[18px] pb-[26px] pt-[22px]">
        {onClose && (
          <button
            type="button"
            aria-label="סגירה"
            onClick={onClose}
            className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border border-pitch-line bg-pitch-900 text-chalk"
          >
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
        <svg aria-hidden="true" width="58" height="44" viewBox="0 0 24 18">
          <defs>
            <linearGradient id="riCrown" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#A47A14" />
              <stop offset=".35" stopColor="#F3D36B" />
              <stop offset=".5" stopColor="#FFF3C4" />
              <stop offset=".65" stopColor="#E0BB45" />
              <stop offset="1" stopColor="#A47A14" />
            </linearGradient>
          </defs>
          <g fill="url(#riCrown)">
            <path d="M3 6l4.6 3.6L12 2.5l4.4 7.1L21 6l-1.8 9H4.8z" />
            <circle cx="3" cy="5" r="1.6" />
            <circle cx="12" cy="1.8" r="1.7" />
            <circle cx="21" cy="5" r="1.6" />
          </g>
        </svg>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[13px] font-extrabold tracking-[.12em] text-[#B9D3C1]">מחזור חדש נפתח</span>
          <span className="text-gold font-display text-[54px] font-bold leading-none">{roundLabel}</span>
        </div>
      </div>

      {(config.title?.trim() || config.body?.trim()) && (
        <div className="flex flex-col gap-2.5 px-[18px] pb-1.5 pt-[18px]">
          <div className="flex items-center gap-2">
            <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-green-50 text-pitch-600">
              <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 5h16v11H8l-4 4z" />
              </svg>
            </span>
            <span className="text-xs font-extrabold text-muted">הודעה מהמנהל</span>
          </div>
          {config.title?.trim() && <h2 className="text-[22px] font-black leading-tight">{config.title}</h2>}
          {config.body?.trim() && (
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-[#2E3A32]">{config.body.trim()}</p>
          )}
        </div>
      )}

      {ctx?.main && (
        <div className="bg-gold-light mx-[18px] mt-2.5 flex items-center gap-2.5 rounded-2xl px-3 py-2.5">
          <span className="flex shrink-0 flex-col text-[11px] font-extrabold leading-tight text-[#5C4400]">
            המשחק
            <br />
            המרכזי
          </span>
          <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
            <Crest team={ctx.main.home} />
            <span className="truncate text-[13px] font-extrabold">{shortTeamName(ctx.main.home)}</span>
            <span className="text-xs font-bold text-[#6E5200]">נגד</span>
            <span className="truncate text-[13px] font-extrabold">{shortTeamName(ctx.main.away)}</span>
            <Crest team={ctx.main.away} />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5 px-[18px] pb-[18px] pt-4">
        <button
          type="button"
          onClick={onAction}
          className="bg-gold flex h-[54px] items-center justify-center gap-2 rounded-[14px] text-base font-black text-gold-ink"
        >
          יאללה לנחש
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        {config.show_once && (
          <span className="text-center text-xs text-[#6B6F68]">ההודעה מופיעה פעם אחת בכל מחזור</span>
        )}
      </div>
    </section>
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
