import { useId } from "react";

// Metallic gold used by every gold SVG fill in the brand (see design/HANDOFF.md §1).
function GoldGradient({ id }: { id: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#A47A14" />
      <stop offset=".35" stopColor="#F3D36B" />
      <stop offset=".5" stopColor="#FFF3C4" />
      <stop offset=".65" stopColor="#E0BB45" />
      <stop offset="1" stopColor="#A47A14" />
    </linearGradient>
  );
}

// Crowned "2:1" flip-score mark. Inline (not <img>) so the digits render in
// the app's Oswald font instead of a fallback. useId keeps the gradient id
// unique when the mark appears more than once on a page.
export function LogoMark({ size = 38, className }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "") + "gold";
  const gold = `url(#${id})`;
  const digit = { fontFamily: "var(--font-oswald), 'Arial Narrow', sans-serif", fontWeight: 700, fontSize: 32 };

  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 96 96" className={className} style={{ direction: "ltr" }}>
      <defs>
        <GoldGradient id={id} />
      </defs>
      <rect x="4" y="12" width="88" height="80" rx="20" fill="#0B2A17" stroke={gold} strokeWidth="3" />
      <rect x="14" y="30" width="28" height="48" rx="6" fill="#F7F3E3" />
      <rect x="54" y="30" width="28" height="48" rx="6" fill={gold} />
      <text x="28" y="67" textAnchor="middle" fill="#123F24" style={digit}>2</text>
      <text x="68" y="67" textAnchor="middle" fill="#2A2005" style={digit}>1</text>
      <circle cx="48" cy="46" r="2.8" fill="#F7F3E3" />
      <circle cx="48" cy="62" r="2.8" fill="#F7F3E3" />
      <path d="M33 21 L30.5 7.5 L40 13.5 L48 3.5 L56 13.5 L65.5 7.5 L63 21 Z" fill={gold} stroke="#123F24" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="30.5" cy="6" r="2.4" fill={gold} stroke="#123F24" strokeWidth="1.5" />
      <circle cx="48" cy="3" r="2.4" fill={gold} stroke="#123F24" strokeWidth="1.5" />
      <circle cx="65.5" cy="6" r="2.4" fill={gold} stroke="#123F24" strokeWidth="1.5" />
      <path d="M48 10.5 L48.85 12.83 L51.33 12.92 L49.38 14.45 L50.06 16.83 L48 15.45 L45.94 16.83 L46.62 14.45 L44.67 12.92 L47.15 12.83 Z" fill="#123F24" />
    </svg>
  );
}

// PREDICTION (small, letter-spaced gold) over LEGENDS (large, cream).
// Always LTR, even inside the RTL layout.
export function Wordmark({ size = "sm" }: { size?: "sm" | "lg" }) {
  const lg = size === "lg";
  return (
    <span dir="ltr" className="flex flex-col font-display leading-none" aria-label="Prediction Legends">
      <span
        aria-hidden="true"
        className={"text-gold font-semibold " + (lg ? "text-[22px] tracking-[0.42em]" : "text-[8px] tracking-[0.38em]")}
      >
        PREDICTION
      </span>
      <span
        aria-hidden="true"
        className={"font-bold text-chalk " + (lg ? "text-[76px] leading-[.95] tracking-[0.03em]" : "text-[18px]")}
      >
        LEGENDS
      </span>
    </span>
  );
}

// Header lockup: mark + wordmark, LTR so the mark sits before the text.
export default function Logo({ className }: { className?: string }) {
  return (
    <span dir="ltr" className={"flex items-center gap-2 " + (className ?? "")}>
      <LogoMark size={38} />
      <Wordmark />
    </span>
  );
}
