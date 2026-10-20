import { XIcon } from "@/components/icons";

// Sits directly inside each modal's own `fixed inset-0` backdrop (not
// inside the scrollable card), so it's positioned relative to the
// viewport and stays put even while the card's own content scrolls
// internally -- same corner regardless of which modal or how tall its
// content is.
export default function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="סגירה"
      className="absolute end-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm hover:bg-white"
    >
      <XIcon size={18} />
    </button>
  );
}
