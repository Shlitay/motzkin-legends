import Link from "next/link";
import { caveat } from "@/lib/fonts";
import { OneXTwoIcon } from "@/components/icons";

export default function TopBar({ href = "/home" }: { href?: string | null }) {
  const mark = (
    <>
      <OneXTwoIcon size={30} />
      <span className={caveat.className + " text-lg leading-none"}>Motzkin Legends</span>
    </>
  );

  return (
    <header className="fixed left-0 top-0 z-40 px-4 pt-3">
      {href ? (
        <Link href={href} className="flex flex-col items-center gap-1 text-ink">
          {mark}
        </Link>
      ) : (
        <span className="flex flex-col items-center gap-1 text-ink">{mark}</span>
      )}
    </header>
  );
}
