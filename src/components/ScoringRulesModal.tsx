"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ScoringRulesModal({ onClose }: { onClose: () => void }) {
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [exactScore, setExactScore] = useState("10");
  const [correctResult, setCorrectResult] = useState("5");

  useEffect(() => {
    (async () => {
      const { data, error: fetchError } = await supabase
        .from("scoring_rules")
        .select("exact_score_points, correct_result_points")
        .order("effective_from", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      if (data) {
        setExactScore(String(data.exact_score_points));
        setCorrectResult(String(data.correct_result_points));
      }
      setLoading(false);
    })();
  }, [supabase]);

  const filled = exactScore !== "" && correctResult !== "";

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
      setError("You've been signed out — please log in again.");
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase.from("scoring_rules").insert({
      exact_score_points: Number(exactScore),
      correct_result_points: Number(correctResult),
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
        <h2 className="mb-6 text-xl font-semibold">Scoring rules</h2>

        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <>
            <p className="mb-4 text-xs text-muted">
              Applies to future rounds only — past rounds keep the points they were scored with.
            </p>

            <div className="mb-8 flex items-center justify-center gap-6">
              <PointsInput
                label="Exact score"
                value={exactScore}
                onChange={(v) => setPoints(setExactScore, v)}
              />
              <PointsInput
                label="Towards (correct result)"
                value={correctResult}
                onChange={(v) => setPoints(setCorrectResult, v)}
              />
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
