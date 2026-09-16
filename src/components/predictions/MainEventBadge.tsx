// Shown on whichever single match the manager flagged as the round's tiebreak
// decider (matches.is_main_event) — see recompute_round_standings()'s new
// tiebreak in add-match-main-event-tiebreak.sql.
export default function MainEventBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-[#d4a017]/15 px-2.5 py-0.5 text-xs font-semibold text-[#8a6a1a] ${className}`}
    >
      ⭐ המשחק המרכזי
    </span>
  );
}
