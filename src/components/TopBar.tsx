"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { caveat } from "@/lib/fonts";
import { OneXTwoIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";

type RightAction = { label: string; href: string };

const DEFAULT_ACTION: RightAction = { label: "Admin panel", href: "/manager" };

export default function TopBar({
  href = "/home",
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

  const mark = (
    <>
      <OneXTwoIcon size={30} />
      <span className={caveat.className + " text-lg leading-none"}>Motzkin Legends</span>
    </>
  );

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex items-start justify-between px-4 pt-3">
      {href ? (
        <Link href={href} className="flex flex-col items-center gap-1 text-ink">
          {mark}
        </Link>
      ) : (
        <span className="flex flex-col items-center gap-1 text-ink">{mark}</span>
      )}

      {resolvedAction && isManager && (
        <Link
          href={resolvedAction.href}
          className="rounded-full border border-neutral-300 bg-surface px-3 py-1.5 text-xs font-medium text-ink shadow-sm hover:bg-neutral-50"
        >
          {resolvedAction.label}
        </Link>
      )}
    </header>
  );
}
