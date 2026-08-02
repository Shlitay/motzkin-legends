"use client";

import { useState } from "react";
import { AVATAR_LIBRARY, currentUser } from "@/lib/mock-data";

export default function ProfileModal({ onClose }: { onClose: () => void }) {
  const [avatar, setAvatar] = useState(currentUser.avatar);
  const [home, setHome] = useState(
    currentUser.defaultHomeScore === null ? "" : String(currentUser.defaultHomeScore)
  );
  const [away, setAway] = useState(
    currentUser.defaultAwayScore === null ? "" : String(currentUser.defaultAwayScore)
  );

  const filled = home !== "" && away !== "";

  function setScore(setter: (v: string) => void, value: string) {
    if (value !== "" && !/^\d$/.test(value)) return;
    setter(value);
  }

  function save() {
    // Real app: update avatar + default_home_score/default_away_score on
    // the participant's users row.
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg">
        <h2 className="mb-6 text-xl font-semibold">Profile</h2>

        <p className="mb-3 text-sm font-medium text-ink">Avatar</p>
        <div className="mb-7 grid grid-cols-6 gap-2">
          {AVATAR_LIBRARY.map((emoji) => {
            const selected = avatar === emoji;
            return (
              <button
                key={emoji}
                onClick={() => setAvatar(emoji)}
                aria-pressed={selected}
                aria-label={`Pick avatar ${emoji}`}
                className={
                  "flex h-10 w-10 items-center justify-center rounded-full text-lg transition " +
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

        <p className="mb-1 text-sm font-medium text-ink">Default score</p>
        <p className="mb-4 text-xs text-muted">
          Used automatically if you miss a round&apos;s deadline.
        </p>

        <div className="mb-8 flex items-center justify-center gap-3">
          <ScoreInput label="Home" value={home} onChange={(v) => setScore(setHome, v)} />
          <span className="text-lg font-semibold text-muted">–</span>
          <ScoreInput label="Away" value={away} onChange={(v) => setScore(setAway, v)} />
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={onClose}
            className="rounded-full border border-neutral-300 px-6 py-2 font-medium hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            disabled={!filled}
            onClick={save}
            className="rounded-full bg-brand px-6 py-2 font-medium text-white enabled:hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            Save
          </button>
        </div>
      </div>
    </div>
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
