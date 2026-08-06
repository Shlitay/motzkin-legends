import Link from "next/link";
import { caveat } from "@/lib/fonts";
import { OneXTwoIcon } from "@/components/icons";

type RightAction = { label: string; href: string };

const DEFAULT_ACTION: RightAction = { label: "Admin panel", href: "/manager" };

export default function TopBar({
  href = "/home",
  rightAction = DEFAULT_ACTION,
}: {
  href?: string | null;
  rightAction?: RightAction | null;
}) {
  const mark = (
    <>
      <OneXTwoIcon size={30} />
      <span className={caveat.className + " text-lg leading-none"}>Motzkin Legends</span>
    </>
  );

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex items-start justify-between px-4 pt-3">
      {href ? (
        <Link href={href} className="flex flex-col items-center gap-1 text-ink">
          {mark}
        </Link>
      ) : (
        <span className="flex flex-col items-center gap-1 text-ink">{mark}</span>
      )}

      {/* Real app: "Admin panel" only renders when the logged-in user's
          role is 'manager' — here that's always you, so it's always shown. */}
      {rightAction && (
        <Link
          href={rightAction.href}
          className="rounded-full border border-neutral-300 bg-surface px-3 py-1.5 text-xs font-medium text-ink shadow-sm hover:bg-neutral-50"
        >
          {rightAction.label}
        </Link>
      )}
    </header>
  );
}
