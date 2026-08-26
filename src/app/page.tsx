import Link from "next/link";
import GoogleSignInButton from "@/components/GoogleSignInButton";
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
        <h1 className="text-3xl font-bold text-ink">ברוכים הבאים למשחק הניחושים של אורט מוצקין</h1>
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
          עדיין לא אושרתם? שלחו את התשלום דרך Paybox, ואז אשרו בעמוד הבית לאחר ההתחברות.
        </p>

        <Link href="/manager/login" className="text-xs text-muted underline">
          מנהל/ת המשחק? התחברו כאן
        </Link>
      </div>
    </main>
  );
}
