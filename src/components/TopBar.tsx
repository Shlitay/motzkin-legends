"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Logo from "@/components/Logo";
import InviteFriendsButton from "@/components/InviteFriendsButton";
import JackpotBadge from "@/components/JackpotBadge";
import { createClient } from "@/lib/supabase/client";

type RightAction = { label: string; href: string };

const DEFAULT_ACTION: RightAction = { label: "פאנל ניהול", href: "/manager" };

export default function TopBar({
  href = "/predictions",
  rightAction,
}: {
  href?: string | null;
  rightAction?: RightAction | null;
}) {
  // No explicit rightAction passed → this is a participant page showing
  // the default "Admin panel" link, which must only appear for the real
  // manager account. An explicit rightAction (e.g. "Back to game" on
  // /manager) is always shown as-is — that page is already gated by the
  // proxy, so no extra role check is needed here.
  const usingDefaultAction = rightAction === undefined;
  const resolvedAction = usingDefaultAction ? DEFAULT_ACTION : rightAction;

  const [isManager, setIsManager] = useState(!usingDefaultAction);

  useEffect(() => {
    if (!usingDefaultAction) return;
    let active = true;

    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (active) setIsManager(profile?.role === "manager");
    })();

    return () => {
      active = false;
    };
  }, [usingDefaultAction]);

  const mark = <Logo />;

  return (
    // Fixed + z-40 keeps this above all normal page content (the fixed
    // BottomNav shares z-40 but never overlaps this). Deliberately kept
    // *below* z-50, which every modal overlay (ProfileModal, ScoringRules,
    // NewsStrip, ParticipantModal) uses — a header above the modal layer
    // would poke through a modal's dimmed backdrop instead of being
    // covered by it, breaking that dimming effect.
    <header className="fixed inset-x-0 top-0 z-40 flex h-[60px] items-center justify-between bg-pitch-800 px-3.5">
      {href ? (
        <Link href={href} aria-label="Prediction Legends – לדף הניחושים">
          {mark}
        </Link>
      ) : (
        mark
      )}

      {/* Donate button from the design is left out until there's a link
          for it (design/HANDOFF.md, open question 2). */}
      <div className="flex items-center gap-1.5">
        <JackpotBadge />
        <InviteFriendsButton />

        {resolvedAction && isManager && (
          <Link
            href={resolvedAction.href}
            className="flex h-10 items-center whitespace-nowrap rounded-full border border-pitch-line bg-pitch-900 px-3 text-xs font-semibold text-chalk hover:bg-pitch-800"
          >
            {resolvedAction.label}
          </Link>
        )}
      </div>
    </header>
  );
}
