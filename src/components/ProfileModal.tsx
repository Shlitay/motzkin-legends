"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import {
  AVATAR_TAKEN_MESSAGE,
  AvatarGrid,
  AvatarGridHeader,
  AvatarStrip,
  isAvatarTakenError,
  randomFreeAvatar,
  useTakenAvatars,
} from "@/components/AvatarPicker";
import { getCurrentRound } from "@/lib/currentRound";
import { createClient } from "@/lib/supabase/client";

type RoundStats = {
  roundNumber: number;
  approved: boolean;
  rank: number | null;
  points: number;
  exact: number;
  towards: number;
};

// Profile bottom sheet (design/boards/Profile.dc.html), opened from the
// bottom nav.
export default function ProfileModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [stats, setStats] = useState<RoundStats | null>(null);
  const { taken, refresh } = useTakenAvatars(userId);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("התנתקתם מהמערכת — יש להתחבר מחדש.");
        setLoading(false);
        return;
      }
      setUserId(user.id);

      const [{ data: profile, error: profileError }, round] = await Promise.all([
        supabase
          .from("users")
          .select("full_name, nickname, avatar, default_home_score, default_away_score")
          .eq("id", user.id)
          .single(),
        getCurrentRound(supabase),
      ]);

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      setAvatar(profile.avatar?.startsWith("avatar-") ? profile.avatar : null);
      setFullName(profile.full_name);
      setNickname(profile.nickname ?? "");
      setHome(profile.default_home_score === null ? "" : String(profile.default_home_score));
      setAway(profile.default_away_score === null ? "" : String(profile.default_away_score));

      if (round) {
        const { data: p } = await supabase
          .from("round_participation")
          .select("payment_status, rank, total_points, exact_score_count, correct_result_count")
          .eq("round_id", round.id)
          .eq("user_id", user.id)
          .maybeSingle();
        setStats({
          roundNumber: round.round_number,
          approved: p?.payment_status === "approved",
          rank: p?.rank ?? null,
          points: p?.total_points ?? 0,
          exact: p?.exact_score_count ?? 0,
          towards: p?.correct_result_count ?? 0,
        });
      }
      setLoading(false);
    })();
  }, [supabase]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const filled = avatar !== null && home !== "" && away !== "";

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
      .update({
        avatar,
        nickname: nickname.trim() === "" ? null : nickname.trim(),
        default_home_score: Number(home),
        default_away_score: Number(away),
      })
      .eq("id", userId);

    if (updateError) {
      if (isAvatarTakenError(updateError)) {
        setError(AVATAR_TAKEN_MESSAGE);
        setShowAll(true);
        await refresh();
      } else {
        setError(updateError.message);
      }
      setSaving(false);
      return;
    }

    setSaving(false);
    onClose();
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  const displayName = nickname.trim() || fullName;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(11,42,23,.55)]" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label="הפרופיל שלי"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-md flex-col gap-3.5 overflow-y-auto rounded-t-[26px] bg-chalk px-4 pb-4 pt-2.5 shadow-[0_-10px_30px_rgba(0,0,0,.25)]"
      >
        <div className="flex justify-center">
          <span className="h-[5px] w-10 rounded-full bg-miss" />
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-muted">טוען...</p>
        ) : (
          <>
            {/* identity */}
            <div className="relative flex items-center gap-3.5">
              <span className="border-gold flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-full [--gold-border:3px]">
                <Avatar avatar={avatar} size={66} />
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-[21px] font-black">{displayName}</span>
                <span className="truncate text-[13px] text-muted">{fullName} · מחובר עם Google</span>
                {stats?.approved && (
                  <span className="mt-1 inline-flex items-center gap-[5px] self-start rounded-full bg-green-50 px-2.5 py-[3px] text-[11px] font-extrabold text-[#14512D]">
                    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                    מאושר למחזור {stats.roundNumber}
                  </span>
                )}
              </div>
              <button
                type="button"
                aria-label="סגירה"
                onClick={onClose}
                className="absolute -top-1 left-0 flex h-10 w-10 items-center justify-center rounded-full bg-[#ECECE6]"
              >
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#17231C" strokeWidth="2.6" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            {/* stats */}
            {stats && (
              <div className="flex gap-2">
                {[
                  { n: stats.rank ?? "–", l: "מקום במחזור", gold: true },
                  { n: stats.points, l: "נקודות במחזור" },
                  { n: stats.exact, l: "בולים", crown: true },
                  { n: stats.towards, l: "בכיוון", green: true },
                ].map((s) => (
                  <div
                    key={s.l}
                    className={
                      "flex flex-1 flex-col items-center gap-0.5 rounded-[14px] px-1 py-2.5 " +
                      (s.gold ? "border-gold" : "border border-line bg-white")
                    }
                  >
                    <span
                      className={
                        "inline-flex items-center gap-[3px] font-display text-2xl font-bold leading-none " +
                        (s.green ? "text-pitch-600" : "")
                      }
                    >
                      {s.crown && (
                        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="#C9A227">
                          <path d="M3 9l4.6 3.6L12 5.5l4.4 7.1L21 9l-1.8 9H4.8z" />
                          <rect x="4.8" y="19.2" width="14.4" height="2" rx="1" />
                        </svg>
                      )}
                      {s.n}
                    </span>
                    <span className="text-center text-[11px] font-bold text-muted">{s.l}</span>
                  </div>
                ))}
              </div>
            )}

            {/* nickname */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="nick" className="text-[13px] font-extrabold">
                כינוי
              </label>
              <input
                id="nick"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder={fullName}
                maxLength={40}
                className="h-[46px] rounded-xl border-[1.5px] border-miss bg-white px-3 text-[15px] font-semibold outline-none focus-visible:border-pitch-600"
              />
              <span className="text-xs text-muted">מופיע בטבלה במקום השם המלא. השאירו ריק כדי להשתמש בשם מ־Google.</span>
            </div>

            {/* avatar */}
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] font-extrabold">אווטאר</span>
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  aria-expanded={showAll}
                  className="min-h-8 text-xs font-extrabold text-pitch-600"
                >
                  {showAll ? "הצגה מקוצרת" : "כל ה־30 אווטארים"}
                </button>
              </div>
              {showAll ? (
                <div className="flex flex-col gap-2.5 rounded-2xl border border-line bg-white p-3">
                  <AvatarGridHeader taken={taken} onShuffle={() => setAvatar(randomFreeAvatar(taken))} />
                  <AvatarGrid value={avatar} onChange={setAvatar} taken={taken} size={42} />
                </div>
              ) : (
                <AvatarStrip value={avatar} onChange={setAvatar} taken={taken} />
              )}
            </div>

            {/* default result */}
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white px-3.5 py-3">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-[13px] font-extrabold">תוצאת ברירת מחדל</span>
                <span className="text-xs leading-snug text-muted">נכנסת אוטומטית למשחק שלא ניחשתם עד הפתיחה</span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <input
                  value={home}
                  onChange={(e) => setScore(setHome, e.target.value)}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  aria-label="ברירת מחדל: שערים לקבוצת הבית"
                  className="h-[58px] w-[52px] rounded-xl border-2 border-pitch-600 bg-white text-center font-display text-[30px] font-bold outline-none"
                />
                <span className="font-display text-[22px] text-[#A3A39B]">:</span>
                <input
                  value={away}
                  onChange={(e) => setScore(setAway, e.target.value)}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  aria-label="ברירת מחדל: שערים לקבוצת החוץ"
                  className="h-[58px] w-[52px] rounded-xl border-2 border-pitch-600 bg-white text-center font-display text-[30px] font-bold outline-none"
                />
              </div>
            </div>
          </>
        )}

        {error && <p className="text-center text-sm font-semibold text-danger">{error}</p>}

        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            disabled={loading || !filled || saving}
            onClick={save}
            className="h-[52px] rounded-[14px] bg-pitch-800 text-base font-extrabold text-chalk enabled:hover:bg-pitch-900 disabled:bg-[#B9C2BB]"
          >
            {saving ? "שומר..." : avatar === null ? "בחרו אווטאר כדי לשמור" : "שמירה"}
          </button>
          <button type="button" onClick={signOut} className="h-11 text-sm font-bold text-danger">
            התנתקות
          </button>
        </div>
      </section>
    </div>
  );
}
