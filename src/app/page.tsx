import Link from "next/link";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { ENTRY_FEE_ILS } from "@/components/JackpotBadge";
import Logo from "@/components/Logo";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center text-center">
      <div className="flex w-full flex-col items-center gap-3 bg-brand pb-10 pt-14 text-white">
        <img src="/haimzuri.png" alt="חיים צורי" className="h-24 w-auto rounded-full" />
        <Logo className="text-white" />
        <p className="text-sm text-white/75">משחק הניחושים של אורט מוצקין</p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-10">
        <h1 className="flex flex-col items-center gap-2">
          <span className="text-lg font-semibold uppercase tracking-[0.2em] text-muted">
            ברוכים הבאים
          </span>
          <span className="text-4xl font-extrabold text-brand [text-shadow:4px_4px_0_var(--color-legend)] sm:text-5xl">
            למשחק הניחושים
          </span>
          <span className="text-2xl font-extrabold text-legend [-webkit-text-stroke:1px_var(--color-brand-dark)] sm:text-3xl">
            של אגדות מוצקין
          </span>
        </h1>
        <p className="max-w-sm text-muted">
          נחשו את תוצאות ליגת העל בכל מחזור וזכו בקופה.
        </p>

        <GoogleSignInButton
          next="/home"
          className="flex items-center gap-2 rounded-full border border-neutral-300 px-6 py-3 font-medium shadow-sm hover:bg-neutral-50"
        >
          המשך עם Google
        </GoogleSignInButton>

        <p className="text-xs text-muted">
          {/* Trailing RLM after the digit — without it, the space between
              a number and the following Hebrew word collapses visually
              (same bidi class as the NewsTicker fix). */}
          התחבר למשחק ← נחש את תוצאות המחזור ← שלח {ENTRY_FEE_ILS}‏ ש&quot;ח
          <br />
          ואתה בפנים!
        </p>

        <Link href="/manager/login" className="text-xs text-muted underline">
          מנהל/ת המשחק? התחברו כאן
        </Link>
      </div>
    </main>
  );
}
