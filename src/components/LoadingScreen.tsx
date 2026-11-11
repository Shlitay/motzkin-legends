import { LogoMark } from "@/components/Logo";

// Full-page loading state: the crowned logo bobs while three gold dots
// pulse. Static for players who ask for reduced motion (globals.css).
export default function LoadingScreen({ label = "טוען..." }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-1 flex-col items-center justify-center gap-4 py-24">
      <LogoMark size={84} className="pl-logo-bob drop-shadow-[0_8px_14px_rgba(11,42,23,.25)]" />
      <span aria-hidden="true" className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="pl-dot bg-gold h-2 w-2 rounded-full" style={{ animationDelay: `${i * 0.18}s` }} />
        ))}
      </span>
      <span className="sr-only">{label}</span>
    </div>
  );
}
