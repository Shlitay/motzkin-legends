"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import TopBar from "@/components/TopBar";
import { AVATAR_LIBRARY } from "@/lib/mock-data";

export default function OnboardingPage() {
  const router = useRouter();
  const [avatar, setAvatar] = useState<string | null>(null);
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");

  const filled = avatar !== null && home !== "" && away !== "";

  function setScore(setter: (v: string) => void, value: string) {
    if (value !== "" && !/^\d$/.test(value)) return;
    setter(value);
  }

  function save() {
    // Real app: write avatar + default_home_score/default_away_score onto
    // the participant's users row, then this whole step is skipped on
    // future logins.
    router.push("/home");
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-10 px-6 pb-12 pt-28 text-center">
      <TopBar href={null} rightAction={null} />
      <div>
        <span className="rounded bg-brand px-3 py-1 text-sm font-medium text-white">
          One-time setup
        </span>
      </div>

      <section className="w-full max-w-sm">
        <h1 className="mb-2 text-2xl font-bold">Pick your avatar</h1>
        <p className="mb-5 text-sm text-muted">
          Shows up next to your name on the leaderboard and everywhere else.
        </p>
        <div className="grid grid-cols-6 gap-2">
          {AVATAR_LIBRARY.map((emoji) => {
            const selected = avatar === emoji;
            return (
              <button
                key={emoji}
                onClick={() => setAvatar(emoji)}
                aria-pressed={selected}
                aria-label={`Pick avatar ${emoji}`}
                className={
                  "flex h-11 w-11 items-center justify-center rounded-full text-xl transition " +
                  (selected
                    ? "bg-brand/15 ring-2 ring-brand"
                    : "bg-neutral-100 hover:bg-neutral-200")
                }
              >
                {emoji}
              </button>
            );
          })}
        </div>
      </section>

      <section className="w-full max-w-sm">
        <h2 className="mb-2 text-lg font-bold">Set your default prediction</h2>
        <p className="mb-5 text-sm text-muted">
          If you ever forget to submit a prediction before the deadline, this
          score gets used automatically so you don&apos;t lose your spot in
          the round.
        </p>
        <div className="flex items-center justify-center gap-3">
          <ScoreInput label="Home" value={home} onChange={(v) => setScore(setHome, v)} />
          <span className="text-lg font-semibold text-neutral-400">–</span>
          <ScoreInput label="Away" value={away} onChange={(v) => setScore(setAway, v)} />
        </div>
      </section>

      <button
        disabled={!filled}
        onClick={save}
        className="rounded-full bg-brand px-8 py-2 font-medium text-white enabled:hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-neutral-300"
      >
        Save and continue
      </button>
    </main>
  );
}

function ScoreInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="numeric"
        maxLength={1}
        className="h-12 w-12 rounded-lg border border-neutral-300 text-center text-lg"
      />
    </div>
  );
}
