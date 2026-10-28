"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import CloseButton from "@/components/CloseButton";
import { RoundPopupCard, type RoundPopupConfig } from "@/components/RoundIntroPopup";

// Manager editor for the "new round" popup (RoundIntroPopup). One saved
// config (round_popup singleton) that re-triggers for every new round —
// no need to retype it per round. Empty title + text means no popup.
export default function RoundIntroModal({ onClose }: { onClose: () => void }) {
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mainColor, setMainColor] = useState("#1b6b3c");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [showOnce, setShowOnce] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error: fetchError } = await supabase
        .from("round_popup")
        .select("title, body, main_color, bg_color, show_once")
        .eq("id", 1)
        .single();

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      setTitle(data.title ?? "");
      setBody(data.body ?? "");
      setMainColor(data.main_color);
      setBgColor(data.bg_color);
      setShowOnce(data.show_once);
      setLoading(false);
    })();
  }, [supabase]);

  const config: RoundPopupConfig = {
    title,
    body,
    main_color: mainColor,
    bg_color: bgColor,
    show_once: showOnce,
  };

  async function save() {
    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("round_popup")
      .update({
        title: title.trim() === "" ? null : title.trim(),
        body: body.trim() === "" ? null : body.trim(),
        main_color: mainColor,
        bg_color: bgColor,
        show_once: showOnce,
        updated_at: new Date().toISOString(),
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

  if (showPreview) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
        <RoundPopupCard
          config={config}
          onClose={() => setShowPreview(false)}
          onAction={() => setShowPreview(false)}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <div className="relative w-full max-w-sm">
        <CloseButton onClick={onClose} />
        <div className="max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-8 text-center shadow-lg">
          <h2 className="mb-6 text-xl font-semibold">הודעת מחזור</h2>

          {loading ? (
            <p className="text-sm text-muted">טוען...</p>
          ) : (
            <>
              <p className="mb-4 text-xs text-muted">
                מוצגת אוטומטית בכל מחזור חדש. השאירו כותרת וטקסט ריקים כדי לא להציג.
              </p>

              <div className="mb-6 space-y-4 text-start">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted">כותרת</span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={80}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted">טקסט</span>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={5}
                    maxLength={500}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  />
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <ColorField label="צבע ראשי (טקסט)" value={mainColor} onChange={setMainColor} />
                  <ColorField label="צבע משני (רקע)" value={bgColor} onChange={setBgColor} />
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showOnce}
                    onChange={(e) => setShowOnce(e.target.checked)}
                    className="h-4 w-4 accent-brand"
                  />
                  להציג פעם אחת בלבד לכל משתתף
                </label>
                {!showOnce && (
                  <p className="-mt-2 text-xs text-muted">
                    כשלא מסומן: יוצג בכל כניסה לאתר, עד סוף המחזור.
                  </p>
                )}
              </div>

              <button
                onClick={() => setShowPreview(true)}
                className="mb-6 text-sm font-medium text-brand underline underline-offset-2"
              >
                תצוגה מקדימה
              </button>
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
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <div className="flex items-center gap-2 rounded-lg border border-neutral-300 px-2 py-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
        />
        <span dir="ltr" className="font-mono text-xs text-muted">
          {value}
        </span>
      </div>
    </label>
  );
}
