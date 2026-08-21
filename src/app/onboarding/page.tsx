"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import TopBar from "@/components/TopBar";
import { createClient } from "@/lib/supabase/client";
import { AVATAR_LIBRARY } from "@/lib/mock-data";

export default function OnboardingPage() {
  const router = useRouter();
  const [avatar, setAvatar] = useState<string | null>(null);
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filled = avatar !== null && home !== "" && away !== "";

  function setScore(setter: (v: string) => void, value: string) {
    if (value !== "" && !/^\d$/.test(value)) return;
    setter(value);
  }

  async function save() {
    if (!filled) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("התנתקתם מהמערכת — יש להתחבר מחדש.");
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

    router.push("/home");
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-10 px-6 pb-12 pt-28 text-center">
      <TopBar href={null} rightAction={null} />
      <div>
        <span className="rounded bg-brand px-3 py-1 text-sm font-medium text-white">
          הגדרה חד-פעמית
        </span>
      </div>

      <section className="w-full max-w-sm">
        <h1 className="mb-2 text-2xl font-bold">בחרו אווטאר</h1>
        <p className="mb-5 text-sm text-muted">
          יופיע לצד השם שלכם בטבלת הליגה ובכל מקום אחר.
        </p>
        <div className="grid grid-cols-6 gap-2">
          {AVATAR_LIBRARY.map((emoji) => {
            const selected = avatar === emoji;
            return (
              <button
                key={emoji}
                onClick={() => setAvatar(emoji)}
                aria-pressed={selected}
                aria-label={`בחירת אווטאר ${emoji}`}
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
        <h2 className="mb-2 text-lg font-bold">הגדירו ניחוש ברירת מחדל</h2>
        <p className="mb-5 text-sm text-muted">
          אם תשכחו להגיש ניחוש לפני המועד האחרון, התוצאה הזו תוזן אוטומטית
          כדי שלא תפספסו את המחזור.
        </p>
        <div className="flex items-center justify-center gap-3">
          <ScoreInput label="בית" value={home} onChange={(v) => setScore(setHome, v)} />
          <span className="text-lg font-semibold text-neutral-400">–</span>
          <ScoreInput label="חוץ" value={away} onChange={(v) => setScore(setAway, v)} />
        </div>
      </section>

      <button
        disabled={!filled || saving}
        onClick={save}
        className="rounded-full bg-brand px-8 py-2 font-medium text-white enabled:hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-neutral-300"
      >
        {saving ? "שומר..." : "שמור והמשך"}
      </button>

      {error && <p className="text-sm text-danger">{error}</p>}
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
