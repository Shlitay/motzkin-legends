import Link from "next/link";
import Logo from "@/components/Logo";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center text-center">
      <div className="w-full bg-brand pb-10 pt-14 text-white">
        <Logo className="text-white" />
        <p className="mt-3 text-sm text-white/75">
          Prediction league · 7 matches, one jackpot
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-10">
        <h1 className="text-3xl font-bold text-ink">Welcome to the Prediction League</h1>
        <p className="max-w-sm text-muted">
          Predict every round of the Israeli league with your friends and
          compete for the jackpot.
        </p>

        {/* Real Google sign-in wired up once Supabase Auth is connected.
            Real app: route to /onboarding only if default_home_score /
            default_away_score are still unset on the user row, else /home. */}
        <Link
          href="/onboarding"
          className="flex items-center gap-2 rounded-full border border-neutral-300 px-6 py-3 font-medium shadow-sm hover:bg-neutral-50"
        >
          Continue with Google
        </Link>

        <p className="text-xs text-muted">
          Not approved yet? Send your payment via Paybox, then confirm on your
          homepage once you&apos;re logged in.
        </p>

        <Link href="/manager/login" className="text-xs text-muted underline">
          Manager? Sign in here
        </Link>
      </div>
    </main>
  );
}
