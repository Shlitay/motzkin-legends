import { BroadcastIcon, CheckCircleIcon, GridIcon } from "@/components/icons";

type ViewMode = "all" | "live" | "ended";

type MatchViewToggleProps = {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
  // "all" is always shown — "live"/"ended" only exist as options while
  // their own bucket actually has something in it (see predictions/
  // page.tsx's showLiveOption/showEndedOption), so the set of visible
  // segments can shrink and grow over a round's lifetime.
  showLive: boolean;
  showEnded: boolean;
};

const OPTIONS: { mode: ViewMode; label: string; icon: typeof GridIcon }[] = [
  { mode: "all", label: "הכל", icon: GridIcon },
  { mode: "live", label: "בשידור חי", icon: BroadcastIcon },
  { mode: "ended", label: "הסתיימו", icon: CheckCircleIcon },
];

export default function MatchViewToggle({ value, onChange, showLive, showEnded }: MatchViewToggleProps) {
  const visible = OPTIONS.filter(
    (o) => o.mode === "all" || (o.mode === "live" && showLive) || (o.mode === "ended" && showEnded)
  );

  return (
    <div className="flex w-full max-w-md items-center gap-1 rounded-full border-2 border-neutral-300 bg-neutral-100 p-1">
      {visible.map(({ mode, label, icon: Icon }) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          className={`flex flex-1 items-center justify-center gap-1 rounded-full px-2 py-1.5 text-xs font-medium transition ${
            value === mode ? "bg-brand text-white shadow-sm" : "text-muted"
          }`}
        >
          <Icon size={14} />
          <span className="whitespace-nowrap">{label}</span>
        </button>
      ))}
    </div>
  );
}
