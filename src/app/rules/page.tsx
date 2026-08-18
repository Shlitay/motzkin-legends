"use client";

import { useState } from "react";
import BottomNav from "@/components/BottomNav";
import NewsTicker from "@/components/NewsTicker";
import ProfileModal from "@/components/ProfileModal";
import TopBar from "@/components/TopBar";

export default function RulesPage() {
  const [showProfile, setShowProfile] = useState(false);

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-6 pb-24 pt-28">
      <TopBar />
      <NewsTicker />
      <h1 className="text-lg font-medium text-ink">Rules</h1>

      <ul className="w-full max-w-md space-y-3 text-sm text-ink">
        <li>Predict the score of all 7 matches before the round&apos;s first kickoff.</li>
        <li>Exact score → 10 points (&quot;hit&quot;).</li>
        <li>Correct winner, wrong score → 5 points (&quot;towards&quot;).</li>
        <li>Wrong winner → 0 points.</li>
        <li>
          Missed the deadline? Your{" "}
          <button
            onClick={() => setShowProfile(true)}
            className="text-brand underline"
          >
            default score
          </button>{" "}
          fills in automatically.
        </li>
        <li>Most points in the round wins the jackpot. Ties are broken by most exact scores.</li>
      </ul>

      <p className="max-w-md text-center text-xs text-muted">
        Point values are set by the manager and may change between rounds.
      </p>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}

      <BottomNav />
    </main>
  );
}
