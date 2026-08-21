"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function NewsStripModal({ onClose }: { onClose: () => void }) {
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [slot1, setSlot1] = useState("");
  const [slot2, setSlot2] = useState("");
  const [slot3, setSlot3] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error: fetchError } = await supabase
        .from("news_strip")
        .select("slot_1, slot_2, slot_3")
        .eq("id", 1)
        .single();

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      setSlot1(data.slot_1 ?? "");
      setSlot2(data.slot_2 ?? "");
      setSlot3(data.slot_3 ?? "");
      setLoading(false);
    })();
  }, [supabase]);

  async function save() {
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

    const { error: updateError } = await supabase
      .from("news_strip")
      .update({
        slot_1: slot1.trim() === "" ? null : slot1.trim(),
        slot_2: slot2.trim() === "" ? null : slot2.trim(),
        slot_3: slot3.trim() === "" ? null : slot3.trim(),
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq("id", 1);

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
        <h2 className="mb-6 text-xl font-semibold">רצועת חדשות</h2>

        {loading ? (
          <p className="text-sm text-muted">טוען...</p>
        ) : (
          <>
            <p className="mb-4 text-xs text-muted">
              מוצג כרצועה נגללת בכל עמוד. השאירו שדה ריק כדי לדלג עליו.
            </p>

            <div className="mb-8 space-y-3 text-start">
              <NewsField label="אייטם 1" value={slot1} onChange={setSlot1} />
              <NewsField label="אייטם 2" value={slot2} onChange={setSlot2} />
              <NewsField label="אייטם 3" value={slot3} onChange={setSlot3} />
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
            disabled={loading || saving}
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

function NewsField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={120}
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
      />
    </div>
  );
}
