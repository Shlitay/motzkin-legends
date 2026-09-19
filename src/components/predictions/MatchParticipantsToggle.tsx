"use client";

import { useState } from "react";
import { ChevronIcon } from "@/components/icons";
import MatchParticipantsList from "./MatchParticipantsList";

// "View everyone's predictions" toggle + the list itself — shared by
// MatchRow (live/locked matches, inside the card) and the page's ended
// matches (below EndedMatchCard). Collapsed by default so a round's worth
// of matches doesn't become a wall of participant lists.
export default function MatchParticipantsToggle({
  matchId,
  homeScore,
  awayScore,
  standingsOrder,
}: {
  matchId: string;
  homeScore: number | null;
  awayScore: number | null;
  standingsOrder: { userId: string; name: string; avatar: string }[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <button
        onClick={() => setExpanded((e) => !e)}
        className="mt-2 flex w-full items-center justify-center gap-1 text-xs font-medium text-brand hover:underline"
      >
        צפייה בניחושי כל המשתתפים
        <ChevronIcon size={12} className={expanded ? "rotate-90" : "-rotate-90"} />
      </button>
      {expanded && (
        <MatchParticipantsList
          matchId={matchId}
          homeScore={homeScore}
          awayScore={awayScore}
          standingsOrder={standingsOrder}
        />
      )}
    </>
  );
}
