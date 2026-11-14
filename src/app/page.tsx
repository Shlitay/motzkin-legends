import Link from "next/link";
import GoogleSignInButton, { GoogleG } from "@/components/GoogleSignInButton";
import { ENTRY_FEE_ILS } from "@/components/JackpotBadge";
import { LogoMark } from "@/components/Logo";

function ExampleChip({
  crest,
  home,
  away,
  label,
  gold,
  tilt,
}: {
  crest: string;
  home: number;
  away: number;
  label: string;
  gold?: boolean;
  tilt: string;
}) {
  return (
    <div
      className={"flex items-center gap-1.5 rounded-[14px] bg-white px-[9px] py-[7px] shadow-[0_8px_24px_rgba(0,0,0,.28)] " + tilt}
    >
      <img src={crest} alt="" className="h-[22px] w-[22px] object-contain" />
      <span dir="ltr" className="inline-flex gap-1 font-display text-[17px] font-bold text-ink">
        <span>{home}</span>
        <span className="text-[#A3A39B]">:</span>
        <span>{away}</span>
      </span>
      <span
        className={
          "whitespace-nowrap rounded-full px-[9px] py-[3px] text-[11px] font-extrabold " +
          (gold ? "bg-gold text-gold-ink" : "bg-green-50 text-[#14512D]")
        }
      >
        {label}
      </span>
    </div>
  );
}

function Step({ n, className, children }: { n: number; className: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1.5 text-center">
      <span className={"flex h-[34px] w-[34px] items-center justify-center rounded-full font-display text-base font-bold " + className}>
        {n}
      </span>
      <span className="text-xs font-bold leading-[1.35] text-[#3F4B43]">{children}</span>
    </div>
  );
}

function StepArrow() {
  return (
    <svg aria-hidden="true" width="18" height="34" viewBox="0 0 18 34" className="shrink-0">
      <path d="M12 11l-5 6 5 6" fill="none" stroke="#B9C2BB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col bg-pitch-800">
      {/* HERO */}
      <section className="relative flex h-[392px] shrink-0 flex-col items-center gap-3.5 overflow-hidden pt-[34px]">
        <svg
          aria-hidden="true"
          viewBox="0 0 390 392"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full"
        >
          <g fill="none" stroke="#1B6B3C" strokeWidth="1.6">
            <line x1="-400" y1="196" x2="790" y2="196" />
            <circle cx="195" cy="196" r="96" />
            <circle cx="195" cy="196" r="3" fill="#1B6B3C" />
            <rect x="95" y="-2" width="200" height="62" />
            <rect x="95" y="332" width="200" height="62" />
          </g>
        </svg>

        <LogoMark size={108} className="relative" />
        <h1 dir="ltr" className="relative flex flex-col items-center font-display leading-none" aria-label="Prediction Legends">
          <span aria-hidden="true" className="text-gold ps-[.44em] text-[15px] font-semibold tracking-[.44em]">
            PREDICTION
          </span>
          <span aria-hidden="true" className="text-[52px] font-bold tracking-[.03em] text-chalk">
            LEGENDS
          </span>
        </h1>
        <p className="relative rounded-full border border-pitch-line bg-pitch-900 px-3.5 py-[5px] text-[15px] font-semibold text-chalk">
          ליגת הניחושים של החבר׳ה
        </p>
        <div className="relative mt-2 flex gap-2.5">
          <ExampleChip crest="/team-logos/hapoel-petah-tikva.png" home={2} away={0} label="בול +10" gold tilt="rotate-3" />
          <ExampleChip crest="/team-logos/hapoel-tel-aviv.png" home={1} away={3} label="כיוון + הפרש +6" tilt="-rotate-3" />
        </div>
      </section>

      {/* SHEET */}
      <section className="relative -mt-5 flex flex-1 flex-col items-center rounded-t-[28px] bg-chalk px-[22px] pb-[18px] pt-[26px]">
        <div className="flex w-full max-w-sm flex-1 flex-col gap-5">
          <div className="flex flex-col items-center gap-1.5 text-center">
            <span className="text-[13px] font-bold tracking-[.14em] text-muted">ברוכים הבאים</span>
            <h2 className="text-[28px] font-black leading-[1.2] text-pitch-800">
              נחשו. תפגעו בול.
              <br />
              <span className="text-gold [-webkit-text-stroke:.6px_#8A6A12]">תהיו אגדה.</span>
            </h2>
            <p className="text-sm text-muted">11 משחקי ליגת העל בכל מחזור, קופה אחת לזוכה.</p>
          </div>

          <div className="flex items-start gap-1">
            <Step n={1} className="bg-pitch-800 text-chalk">
              מתחברים
              <br />
              עם Google
            </Step>
            <StepArrow />
            <Step n={2} className="bg-pitch-600 text-white">
              מנחשים
              <br />
              11 משחקים
            </Step>
            <StepArrow />
            <Step n={3} className="bg-gold text-gold-ink">
              שולחים ‎{ENTRY_FEE_ILS} ש״ח
              <br />
              ונכנסים לקופה
            </Step>
          </div>

          <GoogleSignInButton
            next="/predictions"
            className="flex h-[54px] items-center justify-center gap-2.5 rounded-full border-[1.5px] border-miss bg-white text-base font-bold text-ink shadow-[0_2px_6px_rgba(17,17,17,.08)] hover:bg-neutral-50"
          >
            <GoogleG />
            המשך עם Google
          </GoogleSignInButton>

          <div className="flex justify-center gap-[18px] text-[13px] font-bold">
            <Link href="/about" className="inline-flex min-h-9 items-center text-pitch-600 underline">
              איך זה עובד
            </Link>
            <Link href="/rules" className="inline-flex min-h-9 items-center text-pitch-600 underline">
              החוקים והקופה
            </Link>
          </div>

          <div className="mt-auto flex justify-center gap-[18px] text-xs">
            <Link href="/manager/login" className="inline-flex min-h-8 items-center text-muted underline">
              מנהל/ת המשחק? התחברו כאן
            </Link>
            <Link href="/privacy" className="inline-flex min-h-8 items-center text-muted underline">
              מדיניות פרטיות
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
