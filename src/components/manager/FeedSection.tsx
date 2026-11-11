"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// API-Football score feed (add-score-feed.sql) — state + pause/resume. The
// feed itself runs inside Supabase; this only reads and toggles it.
export type FeedState = {
  paused: boolean;
  interval_minutes: number;
  daily_cap: number;
  requests_day: string | null;
  requests_today: number;
  last_checked_at: string | null;
  last_update_at: string | null;
  last_update_summary: string | null;
  last_error: string | null;
  last_error_at: string | null;
};

export function useScoreFeed() {
  const [supabase] = useState(() => createClient());
  const [state, setState] = useState<FeedState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchState = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("score_feed")
      .select(
        "paused, interval_minutes, daily_cap, requests_day, requests_today, last_checked_at, last_update_at, last_update_summary, last_error, last_error_at"
      )
      .eq("id", 1)
      .single();
    return { data, fetchError };
  }, [supabase]);

  useEffect(() => {
    let active = true;
    const run = () =>
      fetchState().then(({ data, fetchError }) => {
        if (!active) return;
        if (fetchError) setError(fetchError.message);
        else {
          setState(data);
          setError(null);
        }
      });
    run();
    const t = setInterval(run, 30_000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [fetchState]);

  async function togglePaused() {
    if (!state) return;
    setBusy(true);
    const { error: rpcError } = await supabase.rpc("set_score_feed_paused", { p_paused: !state.paused });
    if (rpcError) setError(rpcError.message);
    const { data } = await fetchState();
    if (data) setState(data);
    setBusy(false);
  }

  async function checkNow() {
    setBusy(true);
    const { error: rpcError } = await supabase.rpc("score_feed_check_now");
    if (rpcError) setError(rpcError.message);
    const { data } = await fetchState();
    if (data) setState(data);
    setBusy(false);
    return !rpcError;
  }

  return { state, error, busy, togglePaused, checkNow };
}

// "לפני 2 דק׳" style relative time.
function ago(iso: string | null, now: Date) {
  if (!iso) return "—";
  const sec = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return `לפני ${sec} שנ׳`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `לפני ${min} דק׳`;
  const h = Math.floor(min / 60);
  if (h < 24) return `לפני ${h} שע׳`;
  return `לפני ${Math.floor(h / 24)} ימים`;
}

export function feedRequestsToday(state: FeedState) {
  // The counter resets at 00:00 UTC, like the API's own quota.
  const todayUtc = new Date().toISOString().slice(0, 10);
  return state.requests_day === todayUtc ? state.requests_today : 0;
}

export default function FeedSection({
  feed,
  now,
  hasLive,
}: {
  feed: ReturnType<typeof useScoreFeed>;
  now: Date;
  hasLive: boolean;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  const { state, error, busy, checkNow } = feed;
  if (!state) return <p className="text-sm text-muted">{error ?? "טוען..."}</p>;

  const requestsToday = feedRequestsToday(state);
  // A cap error stops being true once the counter resets.
  const lastError =
    state.last_error === "daily request cap reached" && requestsToday < state.daily_cap ? null : state.last_error;

  const status = state.paused
    ? { label: "מושהה", hint: "התוצאות לא מתעדכנות", bg: "bg-[#F4F4F0]", fg: "text-[#3F4440]", dot: "bg-[#8E918A]" }
    : hasLive
    ? { label: "פעיל · מעדכן עכשיו", hint: `כל ${state.interval_minutes} דק׳`, bg: "bg-green-50", fg: "text-[#14512D]", dot: "pl-pulse bg-pitch-600" }
    : { label: "פעיל", hint: "ממתין למשחק חי", bg: "bg-green-50", fg: "text-[#14512D]", dot: "bg-pitch-600" };

  return (
    <>
      <div className={"flex items-center gap-2 rounded-xl px-3 py-2.5 " + status.bg}>
        <span className={"h-[9px] w-[9px] rounded-full " + status.dot} />
        <span className={"text-sm font-extrabold " + status.fg}>{status.label}</span>
        <span className={"ms-auto text-xs " + status.fg}>{status.hint}</span>
      </div>
      <div className="flex gap-1.5">
        {[
          ["עדכון אחרון", ago(state.last_update_at, now)],
          ["בדיקה אחרונה", ago(state.last_checked_at, now)],
          ["בקשות היום", `${requestsToday}/${state.daily_cap}`],
        ].map(([l, v]) => (
          <div key={l} className="flex flex-1 flex-col gap-0.5 rounded-xl bg-chalk px-2.5 py-[9px]">
            <span className="text-[11px] font-bold text-muted">{l}</span>
            <span className="text-sm font-extrabold">{v}</span>
          </div>
        ))}
      </div>
      {state.last_update_summary && (
        <p className="rounded-xl bg-[#FAFAF7] px-3 py-2 text-xs text-ink">{state.last_update_summary}</p>
      )}
      {lastError && (
        <p className="rounded-xl bg-[#FDF1F0] px-3 py-2 text-xs text-danger">
          <span dir="ltr">{lastError}</span>
        </p>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
      {notice && <p className="text-xs text-muted">{notice}</p>}
      <button
        type="button"
        disabled={busy || state.paused}
        onClick={async () => {
          if (await checkNow()) setNotice("הבדיקה תרוץ תוך דקה, אם יש משחק חי כרגע.");
        }}
        className="min-h-10 self-start rounded-xl border-[1.5px] border-miss bg-white px-3 text-xs font-extrabold text-[#3F4440] disabled:opacity-50"
      >
        בדיקה עכשיו
      </button>
      <span className="text-[11px] text-[#6B6F68]">תוצאה שערכתם ידנית לא תידרס על ידי העדכון האוטומטי.</span>
    </>
  );
}
