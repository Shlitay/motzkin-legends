"use client";

import { useEffect, useState } from "react";
import { RoundPopupCard, type RoundPopupConfig } from "@/components/RoundIntroPopup";
import { createClient } from "@/lib/supabase/client";

// New-round popup message (round_popup singleton, re-shown for every new
// round). Always brand colors now — main_color/bg_color stay in the table
// but are left untouched here.
export default function MessageSection() {
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [config, setConfig] = useState<RoundPopupConfig>({
    title: "",
    body: "",
    main_color: "",
    bg_color: "",
    show_once: true,
  });

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("round_popup")
        .select("title, body, main_color, bg_color, show_once")
        .eq("id", 1)
        .single();
      if (error) setMessage({ text: error.message, error: true });
      else setConfig({ ...data, title: data.title ?? "", body: data.body ?? "" });
      setLoading(false);
    })();
  }, [supabase]);

  async function save() {
    setSaving(true);
    setMessage(null);
    const { error } = await supabase
      .from("round_popup")
      .update({
        title: config.title?.trim() || null,
        body: config.body?.trim() || null,
        show_once: config.show_once,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    setSaving(false);
    setMessage(error ? { text: error.message, error: true } : { text: "נשמר ✓", error: false });
  }

  if (loading) return <p className="text-sm text-muted">טוען...</p>;

  const inputCls =
    "w-full rounded-xl border-[1.5px] border-miss bg-white px-3 py-2.5 text-[15px] text-ink outline-none focus-visible:border-pitch-600";

  return (
    <>
      <span className="text-xs text-muted">
        {config.show_once ? "מוצגת פעם אחת לכל משתתף, בכניסה הראשונה למחזור." : "מוצגת בכל כניסה לאתר, עד סוף המחזור."} כותרת
        וטקסט ריקים = בלי הודעה.
      </span>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="mtitle" className="text-[13px] font-extrabold">
          כותרת
        </label>
        <input
          id="mtitle"
          value={config.title ?? ""}
          maxLength={80}
          onChange={(e) => setConfig((c) => ({ ...c, title: e.target.value }))}
          className={inputCls}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="mbody" className="text-[13px] font-extrabold">
          טקסט
        </label>
        <textarea
          id="mbody"
          rows={4}
          maxLength={500}
          value={config.body ?? ""}
          onChange={(e) => setConfig((c) => ({ ...c, body: e.target.value }))}
          className={inputCls + " resize-none leading-relaxed"}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={config.show_once}
          onChange={(e) => setConfig((c) => ({ ...c, show_once: e.target.checked }))}
          className="h-4 w-4 accent-pitch-600"
        />
        להציג פעם אחת בלבד לכל משתתף
      </label>
      {message && <p className={"text-center text-sm font-semibold " + (message.error ? "text-danger" : "text-pitch-600")}>{message.text}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setPreview(true)}
          className="flex min-h-[50px] flex-1 items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-miss bg-white text-sm font-extrabold text-[#3F4440]"
        >
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          תצוגה מקדימה
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="min-h-[50px] flex-1 rounded-xl bg-pitch-800 text-[15px] font-extrabold text-chalk enabled:hover:bg-pitch-900 disabled:bg-[#B9C2BB]"
        >
          {saving ? "שומר..." : "שמירה"}
        </button>
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(11,42,23,.62)] px-[18px]">
          <RoundPopupCard config={config} onClose={() => setPreview(false)} onAction={() => setPreview(false)} />
        </div>
      )}
    </>
  );
}
