"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import ProfileModal from "@/components/ProfileModal";
import { BookIcon, GaugeIcon, OneXTwoIcon, WinnerIcon } from "@/components/icons";

const links = [
  { href: "/predictions", label: "Predictions", Icon: OneXTwoIcon },
  { href: "/leaderboard", label: "League board", Icon: WinnerIcon },
  { href: "/rules", label: "Rules", Icon: BookIcon },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [showProfile, setShowProfile] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 border-t border-neutral-200 bg-surface">
        <ul className="mx-auto flex max-w-md justify-around py-2 text-xs">
          {links.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={
                    "flex flex-col items-center gap-0.5 px-2 py-1 " +
                    (active
                      ? "font-semibold text-brand"
                      : "text-muted hover:text-ink")
                  }
                >
                  <Icon />
                  {label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              onClick={() => setShowProfile(true)}
              className="flex flex-col items-center gap-0.5 px-2 py-1 text-muted hover:text-ink"
            >
              <GaugeIcon />
              Profile
            </button>
          </li>
        </ul>
      </nav>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </>
  );
}
