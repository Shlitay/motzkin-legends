"use client";

import { useState } from "react";
import type { ScoringRules } from "@/lib/scoring";
import { createClient } from "@/lib/supabase/client";

type Key = keyof ScoringRules;

const GROUPS: { title: string; rows: { key: Key; label: string; hint: string; color: string }[] }[] = [
  {
    title: "ניצחון בית / חוץ",
    rows: [
      { key: "winHit", label: "בול", hint: "תוצאה מדויקת", color: "text-[#6E5200]" },
      { key: "winTowards", label: "בכיוון", hint: "המנצחת הנכונה", color: "text-[#14512D]" },
    ],
  },
  {
    title: "תיקו",
    rows: [
      { key: "drawHit", label: "בול", hint: "תיקו מדויק", color: "text-[#6E5200]" },
      { key: "drawTowards", label: "כיוון תיקו", hint: "ניחשת תיקו, לא מדויק", color: "text-[#14512D]" },
    ],
  },
  {
    title: "בונוס",
    rows: [{ key: "sameDiffBonus", label: "הפרש שערים זהה", hint: "נוסף ל״בכיוון״ בניצחון", color: "text-[#14512D]" }],
  },
];

// Scoring steppers. Saving inserts a new scoring_rules row (applies to
// future rounds; past rounds keep their original scoring).
export default function ScoringSection({
  rules,
  onSaved,
}: {
  rules: ScoringRules;
  onSaved: (r: ScoringRules) => void;
}) {
  const [supabase] = useState(() => createClient());
  const [draft, setDraft] = useState<ScoringRules>(rules);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const changed = (Object.keys(draft) as Key[]).some((k) => draft[k] !== rules[k]);

  function step(k: Key, d: number) {
    setMessage(null);
    setDraft((prev) => ({ ...prev, [k]: Math.max(0, Math.min(99, prev[k] + d)) }));
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setMessage({ text: "התנתקתם מהמערכת — יש להתחבר מחדש.", error: true });
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("scoring_rules").insert({
      win_hit_points: draft.winHit,
      win_towards_points: draft.winTowards,
      same_diff_bonus_points: draft.sameDiffBonus,
      draw_hit_points: draft.drawHit,
      draw_towards_points: draft.drawTowards,
      created_by: user.id,
    });
    setSaving(false);
    if (error) {
      setMessage({ text: error.message, error: true });
      return;
    }
    onSaved(draft);
    setMessage({ text: "נשמר ✓", error: false });
  }

  return (
    <>
      <span className="text-xs text-muted">חל על המחזורים הבאים — מחזורים שעברו שומרים על הניקוד המקורי שלהם.</span>
      {GROUPS.map((g) => (
        <div key={g.title} className="flex flex-col">
          <span className="text-xs font-extrabold text-muted">{g.title}</span>
          {g.rows.map((r) => (
            <div key={r.key} className="flex min-h-[52px] items-center justify-between gap-2.5 border-b border-[#F0F0EA] last:border-b-0">
              <span className="flex flex-col gap-0.5">
                <span className={"text-sm font-extrabold " + r.color}>{r.label}</span>
                <span className="text-[11px] text-[#6B6F68]">{r.hint}</span>
              </span>
              <div className="flex items-center overflow-hidden rounded-xl border-[1.5px] border-miss" dir="ltr">
                <button
                  type="button"
                  onClick={() => step(r.key, -1)}
                  aria-label={`הורדת נקודה: ${r.label} (${g.title})`}
                  className="h-10 w-10 bg-white text-xl font-bold"
                >
                  −
                </button>
                <span className="w-10 text-center font-display text-xl font-bold">{draft[r.key]}</span>
                <button
                  type="button"
                  onClick={() => step(r.key, 1)}
                  aria-label={`הוספת נקודה: ${r.label} (${g.title})`}
                  className="h-10 w-10 bg-white text-xl font-bold"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}
      {message && <p className={"text-center text-sm font-semibold " + (message.error ? "text-danger" : "text-pitch-600")}>{message.text}</p>}
      <button
        type="button"
        disabled={!changed || saving}
        onClick={save}
        className="min-h-[50px] rounded-xl bg-pitch-800 text-[15px] font-extrabold text-chalk enabled:hover:bg-pitch-900 disabled:bg-[#B9C2BB]"
      >
        {saving ? "שומר..." : "שמירת ניקוד"}
      </button>
    </>
  );
}
