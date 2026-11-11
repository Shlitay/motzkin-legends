import Link from "next/link";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import Logo from "@/components/Logo";

export default function ManagerLoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center text-center">
      <div className="w-full bg-pitch-800 pb-10 pt-14">
        <Logo className="justify-center" />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-10">
        <span className="border-gold rounded-full px-3 py-1 text-sm font-bold text-pitch-800">
          כניסת מנהל
        </span>

        <h1 className="text-3xl font-bold text-ink">ברוך שובך</h1>
        <p className="max-w-sm text-muted">
          התחברו עם חשבון ה-Google של המנהל כדי לאשר משתתפים ולנהל את המחזור.
        </p>

        {/* Middleware checks role = 'manager' on the resulting session and
            bounces non-managers to /predictions. */}
        <GoogleSignInButton
          next="/manager"
          className="flex items-center gap-2 rounded-full border border-neutral-300 px-6 py-3 font-medium shadow-sm hover:bg-neutral-50"
        >
          המשך עם Google
        </GoogleSignInButton>

        <Link href="/" className="text-xs text-muted underline">
          חזרה להתחברות
        </Link>
      </div>
    </main>
  );
}
