"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AVATAR_LIBRARY } from "@/lib/mock-data";

export default function ProfileModal({ onClose }: { onClose: () => void }) {
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [avatar, setAvatar] = useState<string | null>(null);
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You've been signed out — please log in again.");
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("avatar, default_home_score, default_away_score")
        .eq("id", user.id)
        .single();

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      setAvatar(profile.avatar);
      setHome(profile.default_home_score === null ? "" : String(profile.default_home_score));
      setAway(profile.default_away_score === null ? "" : String(profile.default_away_score));
      setLoading(false);
    })();
  }, [supabase]);

  const filled = avatar !== null && home !== "" && away !== "";

  function setScore(setter: (v: string) => void, value: string) {
    if (value !== "" && !/^\d$/.test(value)) return;
    setter(value);
  }

  async function save() {
    if (!filled) return;
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You've been signed out — please log in again.");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({
        avatar,
        default_home_score: Number(home),
        default_away_score: Number(away),
      })
      .eq("id", user.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg">
        <h2 className="mb-6 text-xl font-semibold">Profile</h2>

        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <>
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
          </>
        )}

        {error && <p className="mb-4 text-xs text-danger">{error}</p>}

        <div className="flex justify-center gap-4">
          <button
            onClick={onClose}
            className="rounded-full border border-neutral-300 px-6 py-2 font-medium hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            disabled={loading || !filled || saving}
            onClick={save}
            className="rounded-full bg-brand px-6 py-2 font-medium text-white enabled:hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            {saving ? "Saving…" : "Save"}
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
