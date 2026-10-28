"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentRound, type CurrentRound } from "@/lib/currentRound";
import CloseButton from "@/components/CloseButton";

// Manager editor for the current round's one-time intro popup
// (RoundIntroPopup). First line becomes the popup's title, the rest its
// body. Leaving it empty means no popup for this round.
export default function RoundIntroModal({ onClose }: { onClose: () => void }) {
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [round, setRound] = useState<CurrentRound | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      const current = await getCurrentRound(supabase);
      if (!current) {
        setError("אין מחזור פעיל.");
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("rounds")
        .select("intro_message")
        .eq("id", current.id)
        .single();

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      setRound(current);
      setMessage(data.intro_message ?? "");
      setLoading(false);
    })();
  }, [supabase]);

  async function save() {
    if (!round) return;
    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("rounds")
      .update({ intro_message: message.trim() === "" ? null : message.trim() })
      .eq("id", round.id);

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
      <div className="relative w-full max-w-sm">
        <CloseButton onClick={onClose} />
        <div className="rounded-2xl bg-white p-8 text-center shadow-lg">
          <h2 className="mb-6 text-xl font-semibold">
            הודעת מחזור{round ? ` ${round.round_number}` : ""}
          </h2>

          {loading ? (
            <p className="text-sm text-muted">טוען...</p>
          ) : (
            round && (
              <>
                <p className="mb-4 text-xs text-muted">
                  מוצגת פעם אחת לכל משתתף. השורה הראשונה היא הכותרת. השאירו ריק כדי לא להציג.
                </p>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  maxLength={500}
                  className="mb-8 w-full rounded-lg border border-neutral-300 px-3 py-2 text-start text-sm"
                />
              </>
            )
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
              disabled={loading || saving || !round}
              onClick={save}
              className="rounded-full bg-brand px-6 py-2 font-medium text-white enabled:hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-neutral-300"
            >
              {saving ? "שומר..." : "שמירה"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
