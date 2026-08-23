import Link from "next/link";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import Logo from "@/components/Logo";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center text-center">
      <div className="w-full bg-brand pb-10 pt-14 text-white">
        <Logo className="text-white" />
        <p className="mt-3 text-sm text-white/75">
          ליגת ניחושים · 7 משחקים, זוכה אחד
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-10">
        <img src="/haimzuri.png" alt="חיים צורי" className="h-32 w-auto" />
        <h1 className="text-3xl font-bold text-ink">ברוכים הבאים לליגת הניחושים</h1>
        <p className="max-w-sm text-muted">
          נחשו כל מחזור בליגת העל את תוצאות המחזור ותתחרו עם החברים על לזכות בקופה.
        </p>

        <GoogleSignInButton
          next="/home"
          className="flex items-center gap-2 rounded-full border border-neutral-300 px-6 py-3 font-medium shadow-sm hover:bg-neutral-50"
        >
          המשך עם Google
        </GoogleSignInButton>

        <p className="text-xs text-muted">
          עדיין לא אושרתם? שלחו את התשלום דרך Paybox, ואז אשרו בעמוד הבית לאחר ההתחברות.
        </p>

        <Link href="/manager/login" className="text-xs text-muted underline">
          מנהל/ת המשחק? התחברו כאן
        </Link>
      </div>
    </main>
  );
}
