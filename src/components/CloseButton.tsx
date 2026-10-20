import { XIcon } from "@/components/icons";

// Sits inside each modal's non-scrolling `relative` card wrapper (a
// sibling of the actual scrollable card div, not inside it), so it
// stays pinned to the card's own top-right corner even while the
// card's content scrolls internally. Explicitly `right` rather than
// the logical `end` — this is a fixed visual corner regardless of RTL,
// not a direction that should flip with text direction.
export default function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="סגירה"
      className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm hover:bg-white"
    >
      <XIcon size={18} />
    </button>
  );
}
