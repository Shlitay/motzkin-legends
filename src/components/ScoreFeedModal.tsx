"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import CloseButton from "@/components/CloseButton";

// Manager controls for the automatic API-Football score feed
// (add-score-feed.sql). The feed itself runs inside Supabase every minute;
// this only shows its state and pauses/resumes it. Manual score entry in
// "תוצאות מחזור" keeps working either way, and a match marked final there
// is never touched by the feed.
type FeedState = {
  paused: boolean;
  interval_minutes: number;
  daily_cap: number;
  requests_day: string | null;
  requests_today: number;
  last_request_at: string | null;
  last_checked_at: string | null;
  last_update_at: string | null;
  last_update_summary: string | null;
  last_error: string | null;
  last_error_at: string | null;
};

const timeFormat = new Intl.DateTimeFormat("he-IL", {
  timeZone: "Asia/Jerusalem",
  day: "numeric",
  month: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatTime(iso: string | null) {
  return iso ? timeFormat.format(new Date(iso)) : "—";
}

export default function ScoreFeedModal({ onClose }: { onClose: () => void }) {
  const [supabase] = useState(() => createClient());
  const [state, setState] = useState<FeedState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("score_feed")
      .select(
        "paused, interval_minutes, daily_cap, requests_day, requests_today, last_request_at, last_checked_at, last_update_at, last_update_summary, last_error, last_error_at",
      )
      .eq("id", 1)
      .single();

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setState(data);
      setError(null);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    (async () => {
      await load();
    })();
    const timer = setInterval(load, 30_000);
    return () => clearInterval(timer);
  }, [load]);

  async function togglePaused() {
    if (!state) return;
    setBusy(true);
    setNotice(null);
    const { error: rpcError } = await supabase.rpc("set_score_feed_paused", { p_paused: !state.paused });
    if (rpcError) setError(rpcError.message);
    await load();
    setBusy(false);
  }

  async function checkNow() {
    setBusy(true);
    setNotice(null);
    const { error: rpcError } = await supabase.rpc("score_feed_check_now");
    if (rpcError) {
      setError(rpcError.message);
    } else {
      setNotice("הבדיקה תרוץ תוך דקה, אם יש משחק חי כרגע.");
    }
    await load();
    setBusy(false);
  }

  // The request counter resets at 00:00 UTC, like the API's own quota.
  const todayUtc = new Date().toISOString().slice(0, 10);
  const requestsToday = state && state.requests_day === todayUtc ? state.requests_today : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <div className="relative w-full max-w-sm">
        <CloseButton onClick={onClose} />
        <div className="max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-8 text-center shadow-lg">
          <h2 className="mb-2 text-xl font-semibold">עדכון תוצאות אוטומטי</h2>
          <p className="mb-6 text-xs text-muted">
            בזמן משחק חי, התוצאות מתעדכנות מ-API-Football בערך כל {state?.interval_minutes ?? 10} דקות.
            משחק שסומן כסיום ב&quot;תוצאות מחזור&quot; לא ישתנה.
          </p>

          {loading ? (
            <p className="text-sm text-muted">טוען...</p>
          ) : state ? (
            <>
              <p
                className={
                  "mb-6 inline-block rounded-full px-4 py-1 text-sm font-semibold " +
                  (state.paused ? "bg-neutral-200 text-ink" : "bg-brand/10 text-brand")
                }
              >
                {state.paused ? "מושהה" : "פעיל"}
              </p>

              <dl className="mb-6 space-y-2 text-start text-sm">
                <Row label="בדיקה אחרונה" value={formatTime(state.last_checked_at)} />
                <Row label="עדכון אחרון" value={formatTime(state.last_update_at)} />
                {state.last_update_summary && (
                  <p className="rounded-lg bg-neutral-50 px-3 py-2 text-xs text-ink">{state.last_update_summary}</p>
                )}
                <Row label="בקשות היום" value={`${requestsToday} / ${state.daily_cap}`} />
                {state.last_error && (
                  <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
                    <span dir="ltr">{state.last_error}</span> ({formatTime(state.last_error_at)})
                  </p>
                )}
              </dl>
            </>
          ) : null}

          {error && <p className="mb-4 text-xs text-danger">{error}</p>}
          {notice && <p className="mb-4 text-xs text-muted">{notice}</p>}

          {state && (
            <div className="flex justify-center gap-4">
              <button
                disabled={busy || state.paused}
                onClick={checkNow}
                className="rounded-full border border-neutral-300 px-5 py-2 text-sm font-medium enabled:hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                בדיקה עכשיו
              </button>
              <button
                disabled={busy}
                onClick={togglePaused}
                className={
                  "rounded-full px-5 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 " +
                  (state.paused ? "bg-brand enabled:hover:bg-brand-dark" : "bg-danger enabled:hover:brightness-95")
                }
              >
                {state.paused ? "הפעלה" : "השהיה"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}
