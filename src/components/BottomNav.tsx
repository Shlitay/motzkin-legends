"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import FloatingCountdown from "@/components/FloatingCountdown";
import ProfileModal from "@/components/ProfileModal";
import { createClient } from "@/lib/supabase/client";

const iconProps = {
  "aria-hidden": true,
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const links = [
  {
    href: "/predictions",
    label: "ניחושים",
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="5" width="7" height="14" rx="2" />
        <rect x="14" y="5" width="7" height="14" rx="2" />
      </svg>
    ),
  },
  {
    href: "/leaderboard",
    label: "טבלה",
    icon: (
      <svg {...iconProps}>
        <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" />
        <path d="M17 6h3v2a3 3 0 0 1-3 3M7 6H4v2a3 3 0 0 0 3 3" />
      </svg>
    ),
  },
  {
    href: "/rules",
    label: "חוקים",
    icon: (
      <svg {...iconProps}>
        <path d="M6 3h9l4 4v14H6z" />
        <path d="M9 12h7M9 16h7M9 8h4" />
      </svg>
    ),
  },
];

const itemClass =
  "flex min-h-11 min-w-16 flex-col items-center justify-center gap-[3px] text-[11px] font-bold";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [showProfile, setShowProfile] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);

  // Re-read after the profile sheet closes so a newly picked avatar shows.
  useEffect(() => {
    if (showProfile) return;
    let active = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("users").select("avatar").eq("id", user.id).single();
      if (!active) return;
      setAvatar(data?.avatar ?? null);
      // No avatar (new player, or one whose emoji avatar was cleared by
      // add-unique-avatars.sql) → pick one first.
      if (data && data.avatar === null) router.replace("/onboarding");
    })();
    return () => {
      active = false;
    };
  }, [supabase, showProfile, router]);

  return (
    <>
      {/* z-40 like TopBar: above all page content (e.g. the leaderboard's
          sticky z-10 card headers), below the z-50 modal overlays. */}
      <nav
        aria-label="ניווט ראשי"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-surface"
      >
        <ul className="mx-auto flex h-[68px] max-w-md items-center justify-around">
          {links.map(({ href, label, icon }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={itemClass + (active ? " text-pitch-800" : " text-[#6B6F68] hover:text-ink")}
                >
                  {icon}
                  {label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              onClick={() => setShowProfile(true)}
              aria-label="הפרופיל שלי"
              className={itemClass + " text-[#6B6F68] hover:text-ink"}
            >
              <span
                aria-hidden="true"
                className="border-gold flex h-6 w-6 items-center justify-center overflow-hidden rounded-full [--gold-fill:#F1F1EC]"
              >
                <Avatar avatar={avatar} size={20} />
              </span>
              פרופיל
            </button>
          </li>
        </ul>
      </nav>

      <FloatingCountdown />

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </>
  );
}
