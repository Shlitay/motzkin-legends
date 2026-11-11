import Link from "next/link";
import GoogleSignInButton, { GoogleG } from "@/components/GoogleSignInButton";
import { LogoMark } from "@/components/Logo";

// Manager login — same layout as the player login (dark pitch hero, light
// sheet), with a gold "מנהל" chip.
export default function ManagerLoginPage() {
  return (
    <main className="flex min-h-screen flex-col bg-pitch-800">
      <section className="relative flex h-[300px] shrink-0 flex-col items-center gap-3 overflow-hidden pt-[34px]">
        <svg aria-hidden="true" viewBox="0 0 390 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
          <g fill="none" stroke="#1B6B3C" strokeWidth="1.6">
            <line x1="-400" y1="150" x2="790" y2="150" />
            <circle cx="195" cy="150" r="80" />
            <circle cx="195" cy="150" r="3" fill="#1B6B3C" />
          </g>
        </svg>

        <LogoMark size={96} className="relative" />
        <h1 dir="ltr" className="relative flex flex-col items-center font-display leading-none" aria-label="Prediction Legends">
          <span aria-hidden="true" className="text-gold ps-[.44em] text-[13px] font-semibold tracking-[.44em]">
            PREDICTION
          </span>
          <span aria-hidden="true" className="text-[44px] font-bold tracking-[.03em] text-chalk">
            LEGENDS
          </span>
        </h1>
        <span className="relative inline-flex items-center gap-[5px] rounded-full border-[1.5px] border-[#8A6A12] bg-pitch-900 px-3 py-1 text-[13px] font-extrabold text-[#E8C65A]">
          <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9l4.6 3.6L12 5.5l4.4 7.1L21 9l-1.8 9H4.8z" />
          </svg>
          כניסת מנהל
        </span>
      </section>

      <section className="relative -mt-5 flex flex-1 flex-col items-center rounded-t-[28px] bg-chalk px-[22px] pb-[18px] pt-[26px]">
        <div className="flex w-full max-w-sm flex-1 flex-col gap-5">
          <div className="flex flex-col items-center gap-1.5 text-center">
            <h2 className="text-[28px] font-black leading-tight text-pitch-800">ברוך שובך</h2>
            <p className="text-sm text-muted">התחברו עם חשבון ה־Google של המנהל כדי לאשר משתתפים ולנהל את המחזור.</p>
          </div>

          {/* The proxy checks role = 'manager' on the resulting session and
              sends non-managers to /predictions. */}
          <GoogleSignInButton
            next="/manager"
            className="flex h-[54px] items-center justify-center gap-2.5 rounded-full border-[1.5px] border-miss bg-white text-base font-bold text-ink shadow-[0_2px_6px_rgba(17,17,17,.08)] hover:bg-neutral-50"
          >
            <GoogleG />
            המשך עם Google
          </GoogleSignInButton>

          <div className="mt-auto flex justify-center text-xs">
            <Link href="/" className="inline-flex min-h-8 items-center text-muted underline">
              חזרה לכניסת משתתפים
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
