import Link from "next/link";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import Logo from "@/components/Logo";

export default function ManagerLoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center text-center">
      <div className="w-full bg-brand-dark pb-10 pt-14 text-white">
        <Logo className="text-white" />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-10">
        <span className="rounded bg-fuchsia-400 px-3 py-1 text-sm font-medium text-white">
          Manager login
        </span>

        <h1 className="text-3xl font-bold text-ink">Welcome back</h1>
        <p className="max-w-sm text-muted">
          Sign in with the manager Google account to approve participants and
          run the round.
        </p>

        {/* Middleware checks role = 'manager' on the resulting session and
            bounces non-managers to /home. */}
        <GoogleSignInButton
          next="/manager"
          className="flex items-center gap-2 rounded-full border border-neutral-300 px-6 py-3 font-medium shadow-sm hover:bg-neutral-50"
        >
          Continue with Google
        </GoogleSignInButton>

        <Link href="/" className="text-xs text-muted underline">
          Back to participant login
        </Link>
      </div>
    </main>
  );
}
