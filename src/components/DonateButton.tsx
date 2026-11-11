"use client";

import { sendGAEvent } from "@next/third-parties/google";

// Owner's PayPal.Me page (PayPal's Donate tool isn't available on the
// account, 2026-11-11). Swap this one URL to change the donation target.
export const DONATE_URL = "https://paypal.me/itayarad613";

// Header donate button (design/boards/Main.dc.html): dark circle with a
// gold-gradient heart and a small dark "$".
export default function DonateButton() {
  return (
    <a
      href={DONATE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="תרומה למשחק (נפתח ב־PayPal)"
      onClick={() => sendGAEvent("event", "donate-click")}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-pitch-line bg-pitch-900 hover:bg-pitch-800"
    >
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24">
        <defs>
          <linearGradient id="donateGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#B8901F" />
            <stop offset=".5" stopColor="#FFF1B8" />
            <stop offset="1" stopColor="#C9A227" />
          </linearGradient>
        </defs>
        <path
          d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z"
          fill="url(#donateGold)"
        />
        <text x="12" y="16" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="900" fill="#2A2005">
          $
        </text>
      </svg>
    </a>
  );
}
