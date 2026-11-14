import Link from "next/link";
import Logo from "@/components/Logo";

// Header for logged-out visitors on the public pages (/about, /rules):
// logo home + a way in. Same height/colour as TopBar so the swap is calm.
export default function PublicHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-[60px] items-center justify-between bg-pitch-800 px-3.5">
      <Link href="/" aria-label="Prediction Legends – לדף הראשי">
        <Logo />
      </Link>
      <nav className="flex items-center gap-1.5 text-xs font-semibold">
        <Link href="/about" className="flex h-10 items-center px-2 text-chalk hover:underline">
          איך זה עובד
        </Link>
        <Link href="/rules" className="flex h-10 items-center px-2 text-chalk hover:underline">
          חוקים
        </Link>
        <Link
          href="/"
          className="flex h-10 items-center whitespace-nowrap rounded-full bg-gold px-3.5 font-extrabold text-gold-ink"
        >
          כניסה
        </Link>
      </nav>
    </header>
  );
}
