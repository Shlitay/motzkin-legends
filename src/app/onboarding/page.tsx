"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AVATAR_TAKEN_MESSAGE,
  AvatarGrid,
  AvatarGridHeader,
  isAvatarTakenError,
  randomFreeAvatar,
  useTakenAvatars,
} from "@/components/AvatarPicker";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

const PRESETS: [number, number][] = [
  [1, 1],
  [1, 0],
  [2, 1],
  [0, 0],
  [1, 2],
];

// First login (design/boards/Onboarding.dc.html): pick a unique avatar and a
// default result. Also where players without an avatar land (e.g. after the
// emoji avatars were cleared) — their saved default result is pre-filled.
export default function OnboardingPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [userId, setUserId] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [home, setHome] = useState("1");
  const [away, setAway] = useState("1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const { taken, suggested, loaded: takenLoaded, refresh } = useTakenAvatars(userId);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase
        .from("users")
        .select("avatar, default_home_score, default_away_score")
        .eq("id", user.id)
        .single();
      if (data) {
        if (data.avatar?.startsWith("avatar-")) setAvatar(data.avatar);
        if (data.default_home_score !== null) setHome(String(data.default_home_score));
        if (data.default_away_score !== null) setAway(String(data.default_away_score));
      }
      setProfileLoaded(true);
    })();
  }, [supabase]);

  // Until the player picks, a random free avatar is pre-selected.
  const chosen = avatar ?? (profileLoaded && takenLoaded ? suggested : null);
  const filled = chosen !== null && home !== "" && away !== "";

  function setScore(setter: (v: string) => void, value: string) {
    if (value !== "" && !/^\d$/.test(value)) return;
    setter(value);
  }

  async function save() {
    if (!filled || !userId) return;
    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("users")
      .update({ avatar: chosen, default_home_score: Number(home), default_away_score: Number(away) })
      .eq("id", userId);

    if (updateError) {
      if (isAvatarTakenError(updateError)) {
        setError(AVATAR_TAKEN_MESSAGE);
        setAvatar(null);
        await refresh();
      } else {
        setError(updateError.message);
      }
      setSaving(false);
      return;
    }

    router.push("/predictions");
  }

  return (
    <main className="flex min-h-screen flex-col items-center pb-6">
      <header className="flex h-[60px] w-full shrink-0 items-center justify-center bg-pitch-800">
        <Logo />
      </header>

      <div className="flex w-full max-w-md flex-1 flex-col gap-3.5 px-4 pt-5">
        <div className="flex flex-col gap-1.5">
          <span className="self-start rounded-full bg-green-50 px-2.5 py-1 text-xs font-extrabold text-[#14512D]">
            הגדרה חד־פעמית · 2 צעדים
          </span>
          <h1 className="text-[26px] font-black leading-tight">רגע לפני שנכנסים למגרש</h1>
          <p className="text-sm text-muted">אפשר לשנות הכול אחר כך מהפרופיל.</p>
        </div>

        <section className="flex flex-col gap-3 rounded-[18px] border border-line bg-white p-4">
          <h2 className="flex items-center gap-2 text-[17px] font-extrabold">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pitch-800 font-display text-[13px] font-semibold text-chalk">
              1
            </span>
            בחרו אווטאר
          </h2>
          <AvatarGridHeader taken={taken} onShuffle={() => setAvatar(randomFreeAvatar(taken))}>
            כל אווטאר שייך לשחקן אחד בלבד.{" "}
          </AvatarGridHeader>
          <AvatarGrid value={chosen} onChange={setAvatar} taken={taken} />
          <div className="flex gap-3.5 text-[11px] font-bold text-muted">
            <span className="inline-flex items-center gap-[5px]">
              <span className="h-3 w-3 rounded-full bg-green-50 shadow-[0_0_0_2px_#1B6B3C]" />
              הבחירה שלך
            </span>
            <span className="inline-flex items-center gap-[5px]">
              <span className="h-3 w-3 rounded-full bg-miss" />
              תפוס (עם שם השחקן)
            </span>
          </div>
        </section>

        <section className="border-gold flex flex-col gap-3 rounded-[18px] p-4">
          <h2 className="flex items-center gap-2 text-[17px] font-extrabold">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pitch-800 font-display text-[13px] font-semibold text-chalk">
              2
            </span>
            תוצאת ברירת מחדל
          </h2>
          <p className="text-[13px] leading-normal text-muted">
            שכחתם לנחש משחק עד שריקת הפתיחה? התוצאה הזו נכנסת אוטומטית, כדי שלא תצאו מהמחזור עם אפס.
          </p>
          <div className="flex items-end justify-center gap-3 py-1">
            {(
              [
                ["קבוצת בית", home, setHome, "שערים לקבוצת הבית"],
                ["קבוצת חוץ", away, setAway, "שערים לקבוצת החוץ"],
              ] as const
            ).map(([label, value, setter, aria], i) => (
              <span key={label} className="contents">
                {i === 1 && <span className="pb-4 font-display text-[30px] font-medium text-[#A3A39B]">:</span>}
                <span className="flex flex-col items-center gap-1.5">
                  <span className="text-xs font-bold text-muted">{label}</span>
                  <input
                    value={value}
                    onChange={(e) => setScore(setter, e.target.value)}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    aria-label={aria}
                    className="h-[72px] w-16 rounded-[14px] border-2 border-pitch-600 bg-white text-center font-display text-[38px] font-bold text-ink outline-none focus-visible:ring-2 focus-visible:ring-pitch-600/40"
                  />
                </span>
              </span>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {PRESETS.map(([h, a]) => {
              const on = home === String(h) && away === String(a);
              return (
                <button
                  key={`${h}-${a}`}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setHome(String(h));
                    setAway(String(a));
                  }}
                  className={
                    "inline-flex min-h-9 items-center gap-[3px] rounded-full border-[1.5px] px-3 font-display text-sm font-semibold " +
                    (on ? "border-pitch-600 bg-green-50 text-[#14512D]" : "border-miss bg-white text-ink")
                  }
                >
                  <span>{h}</span>
                  <span>:</span>
                  <span>{a}</span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-miss bg-[#FAFAF7] px-3 py-2.5 text-xs leading-normal text-[#3F4B43]">
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#55645A" strokeWidth="2.2" strokeLinecap="round" className="shrink-0">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 11v5M12 8h.01" />
            </svg>
            <span>
              ניחוש שהוזן אוטומטית יסומן בכרטיס המשחק בתגית{" "}
              <b className="whitespace-nowrap rounded-md bg-[#EFEFEA] px-1.5 py-px">ברירת מחדל</b>
            </span>
          </div>
        </section>

        {error && <p className="text-center text-sm font-semibold text-danger">{error}</p>}

        <button
          disabled={!filled || saving}
          onClick={save}
          className="mt-auto h-[54px] rounded-[14px] bg-pitch-800 text-base font-extrabold text-chalk enabled:hover:bg-pitch-900 disabled:bg-[#B9C2BB]"
        >
          {saving ? "שומר..." : "שמירה ומעבר לניחושים"}
        </button>
      </div>
    </main>
  );
}
