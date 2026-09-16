"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ScoringRulesModal({ onClose }: { onClose: () => void }) {
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [winHit, setWinHit] = useState("10");
  const [winTowards, setWinTowards] = useState("5");
  const [sameDiffTowards, setSameDiffTowards] = useState("6");
  const [drawHit, setDrawHit] = useState("10");
  const [drawTowards, setDrawTowards] = useState("6");

  useEffect(() => {
    (async () => {
      const { data, error: fetchError } = await supabase
        .from("scoring_rules")
        .select(
          "win_hit_points, win_towards_points, same_diff_towards_points, draw_hit_points, draw_towards_points"
        )
        .order("effective_from", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      if (data) {
        setWinHit(String(data.win_hit_points));
        setWinTowards(String(data.win_towards_points));
        setSameDiffTowards(String(data.same_diff_towards_points));
        setDrawHit(String(data.draw_hit_points));
        setDrawTowards(String(data.draw_towards_points));
      }
      setLoading(false);
    })();
  }, [supabase]);

  const filled = [winHit, winTowards, sameDiffTowards, drawHit, drawTowards].every((v) => v !== "");

  function setPoints(setter: (v: string) => void, value: string) {
    if (value !== "" && !/^\d{1,3}$/.test(value)) return;
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
      setError("התנתקתם מהמערכת — יש להתחבר מחדש.");
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase.from("scoring_rules").insert({
      win_hit_points: Number(winHit),
      win_towards_points: Number(winTowards),
      same_diff_towards_points: Number(sameDiffTowards),
      draw_hit_points: Number(drawHit),
      draw_towards_points: Number(drawTowards),
      created_by: user.id,
    });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg">
        <h2 className="mb-6 text-xl font-semibold">כללי ניקוד</h2>

        {loading ? (
          <p className="text-sm text-muted">טוען...</p>
        ) : (
          <>
            <p className="mb-4 text-xs text-muted">
              חל רק על המחזורים הבאים — מחזורים שעברו שומרים על הניקוד המקורי שלהם.
            </p>

            <div className="mb-8 flex flex-col gap-5">
              <ScoreGroup title="ניצחון בית/חוץ">
                <PointsInput label="כיוון" value={winTowards} onChange={(v) => setPoints(setWinTowards, v)} />
                <PointsInput label="פגיעה" value={winHit} onChange={(v) => setPoints(setWinHit, v)} />
              </ScoreGroup>
              <ScoreGroup title="הפרש שערים זהה">
                <PointsInput
                  label="כיוון"
                  value={sameDiffTowards}
                  onChange={(v) => setPoints(setSameDiffTowards, v)}
                />
              </ScoreGroup>
              <ScoreGroup title="תיקו">
                <PointsInput label="כיוון" value={drawTowards} onChange={(v) => setPoints(setDrawTowards, v)} />
                <PointsInput label="פגיעה" value={drawHit} onChange={(v) => setPoints(setDrawHit, v)} />
              </ScoreGroup>
            </div>
          </>
        )}

        {error && <p className="mb-4 text-xs text-danger">{error}</p>}

        <div className="flex justify-center gap-4">
          <button
            onClick={onClose}
            className="rounded-full border border-neutral-300 px-6 py-2 font-medium hover:bg-neutral-50"
          >
            ביטול
          </button>
          <button
            disabled={loading || !filled || saving}
            onClick={save}
            className="rounded-full bg-brand px-6 py-2 font-medium text-white enabled:hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            {saving ? "שומר..." : "שמירה"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ScoreGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-neutral-50 px-4 py-3">
      <span className="text-sm font-medium text-ink">{title}</span>
      <div className="flex flex-wrap items-center justify-center gap-6">{children}</div>
    </div>
  );
}

function PointsInput({
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
        maxLength={3}
        className="h-12 w-16 rounded-lg border border-neutral-300 text-center text-lg"
      />
    </div>
  );
}
