import { BroadcastIcon, GridIcon } from "@/components/icons";

type MatchViewToggleProps = {
  value: "all" | "live";
  onChange: (value: "all" | "live") => void;
};

// Only rendered once at least one match in the round has kicked off — see
// predictions/page.tsx's showToggle. "live" auto-falls back to "all" the
// moment no match is currently live (page.tsx's own effect), so this
// component only ever needs to reflect whichever value it's given.
export default function MatchViewToggle({ value, onChange }: MatchViewToggleProps) {
  return (
    <div className="flex items-center gap-1 rounded-full border-2 border-neutral-300 bg-neutral-100 p-1">
      <button
        onClick={() => onChange("all")}
        className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition ${
          value === "all" ? "bg-white text-ink shadow-sm" : "text-muted"
        }`}
      >
        <GridIcon size={16} />
        הכל
      </button>
      <button
        onClick={() => onChange("live")}
        className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition ${
          value === "live" ? "bg-brand text-white shadow-sm" : "text-muted"
        }`}
      >
        <BroadcastIcon size={16} />
        בשידור חי
      </button>
    </div>
  );
}
