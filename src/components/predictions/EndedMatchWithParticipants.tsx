"use client";

import { useState } from "react";
import EndedMatchCard from "./EndedMatchCard";
import MatchParticipantsList from "./MatchParticipantsList";

// An ended match's card plus its "everyone's predictions" list. The whole
// card is the toggle (see EndedMatchCard), the list opens right below it.
// Kept separate from EndedMatchCard itself because MatchParticipantsList
// already imports OUTCOME_STYLES from there — putting the list inside the
// card would make the two import each other.
export default function EndedMatchWithParticipants({
  matchId,
  standingsOrder,
  ...card
}: {
  matchId: string;
  standingsOrder: { userId: string; name: string; avatar: string }[];
} & Omit<React.ComponentProps<typeof EndedMatchCard>, "expanded" | "onToggle">) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <EndedMatchCard {...card} expanded={expanded} onToggle={() => setExpanded((e) => !e)} />
      {expanded && (
        <MatchParticipantsList
          matchId={matchId}
          homeScore={card.actualHome}
          awayScore={card.actualAway}
          standingsOrder={standingsOrder}
        />
      )}
    </div>
  );
}
