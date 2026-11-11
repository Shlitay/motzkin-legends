"use client";

import { useState } from "react";
import { TEAM_LOGOS, shortTeamName } from "@/lib/constants";
import { formatIsraelTime } from "@/lib/israelTime";
import { matchStatus } from "@/lib/matchStatus";
import { createClient } from "@/lib/supabase/client";

export type ManagerMatch = {
  id: string;
  home_team: string;
  away_team: string;
  kickoff_at: string;
  home_score: number | null;
  away_score: number | null;
  is_final: boolean;
  is_main_event: boolean;
  result_source: "auto" | "manual" | null;
};

type Edit = { home: string; away: string; final: boolean };

function Crest({ team }: { team: string }) {
  const src = TEAM_LOGOS[team];
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt="" className="h-[26px] w-[26px] shrink-0 object-contain" /> : null;
}

// Results list (design/boards/Manager.dc.html "תוצאות"): one row per match
// with status, where the result came from (אוטומטי / ידני), the main-match
// crown, and score inputs. One save button saves every changed row through
// submit_match_result(), which marks it 'manual' so the feed leaves it alone.
export default function ResultsSection({
  matches,
  roundId,
  roundOpen,
  now,
  onChanged,
}: {
  matches: ManagerMatch[];
  roundId: string;
  roundOpen: boolean;
  now: Date;
  onChanged: () => Promise<void>;
}) {
  const [supabase] = useState(() => createClient());
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const current = (m: ManagerMatch): Edit =>
    edits[m.id] ?? {
      home: m.home_score === null ? "" : String(m.home_score),
      away: m.away_score === null ? "" : String(m.away_score),
      final: m.is_final,
    };

  const isDirty = (m: ManagerMatch) => {
    const e = edits[m.id];
    if (!e) return false;
    return (
      e.home !== (m.home_score === null ? "" : String(m.home_score)) ||
      e.away !== (m.away_score === null ? "" : String(m.away_score)) ||
      e.final !== m.is_final
    );
  };
  const dirty = matches.filter((m) => isDirty(m) && current(m).home !== "" && current(m).away !== "");

  function edit(m: ManagerMatch, patch: Partial<Edit>) {
    setMessage(null);
    setEdits((prev) => ({ ...prev, [m.id]: { ...current(m), ...patch } }));
  }

  function setScore(m: ManagerMatch, side: "home" | "away", value: string) {
    if (value !== "" && !/^\d{1,2}$/.test(value)) return;
    edit(m, { [side]: value });
  }

  async function saveAll() {
    setSaving(true);
    setMessage(null);
    for (const m of dirty) {
      const e = current(m);
      const { error } = await supabase.rpc("submit_match_result", {
        p_match_id: m.id,
        p_home_score: Number(e.home),
        p_away_score: Number(e.away),
        p_is_final: e.final,
      });
      if (error) {
        setMessage({ text: `${shortTeamName(m.home_team)}–${shortTeamName(m.away_team)}: ${error.message}`, error: true });
        setSaving(false);
        await onChanged();
        return;
      }
    }
    setEdits({});
    await onChanged();
    setSaving(false);
    setMessage({ text: `נשמר ✓ הניקוד והטבלה עודכנו (${dirty.length} משחקים)`, error: false });
  }

  // Only one main match per round (set_main_event moves it atomically).
  // Locked once the round has started — it's the 3rd tiebreaker.
  async function toggleMain(m: ManagerMatch) {
    if (!roundOpen) return;
    const { error } = await supabase.rpc("set_main_event", {
      p_round_id: roundId,
      p_match_id: m.is_main_event ? null : m.id,
    });
    if (error) setMessage({ text: error.message, error: true });
    await onChanged();
  }

  // Hand a manually-edited match back to the score feed.
  async function backToAuto(m: ManagerMatch) {
    const { error } = await supabase.from("matches").update({ result_source: null }).eq("id", m.id);
    if (error) setMessage({ text: error.message, error: true });
    await onChanged();
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1">
          <span className="rounded-md bg-green-50 px-1.5 py-0.5 text-[10px] font-extrabold text-[#14512D]">אוטומטי</span>
          מהעדכון החי
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="rounded-md bg-[#FBF3D9] px-1.5 py-0.5 text-[10px] font-extrabold text-[#5C4400]">ידני</span>
          נערך על ידך
        </span>
        <span className="inline-flex items-center gap-1">
          <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="#C9A227">
            <path d="M3 9l4.6 3.6L12 5.5l4.4 7.1L21 9l-1.8 9H4.8z" />
          </svg>
          המשחק המרכזי
        </span>
      </div>

      {matches.map((m) => {
        const status = matchStatus(m.kickoff_at, m.is_final, now);
        const e = current(m);
        const pre = status === "not-started";
        const manual = m.result_source === "manual";
        const pill =
          status === "live"
            ? { label: "חי", cls: "bg-green-50 text-[#14512D]", dot: "pl-pulse bg-pitch-600" }
            : status === "ended"
            ? { label: "הסתיים", cls: "bg-[#EFEFEA] text-[#3F4440]", dot: "bg-[#8E918A]" }
            : { label: `טרם החל · ${formatIsraelTime(m.kickoff_at)}`, cls: "border border-line bg-white text-muted", dot: "bg-miss" };
        const inputCls = pre
          ? "border-dashed bg-[#F4F4F0]"
          : isDirty(m) || manual
          ? "border-gold-500 bg-[#FFFDF5]"
          : status === "live"
          ? "border-[#9CCAAE] bg-white"
          : "border-miss bg-white";

        return (
          <div
            key={m.id}
            className={
              "flex flex-col gap-2 rounded-2xl px-2.5 pb-3 pt-2.5 " +
              (m.is_main_event ? "border-gold" : "border border-[#ECECE6]")
            }
          >
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={"inline-flex items-center gap-[5px] rounded-full px-[9px] py-[3px] text-[11px] font-extrabold " + pill.cls}>
                  <span className={"h-[7px] w-[7px] rounded-full " + pill.dot} />
                  {pill.label}
                </span>
                {m.result_source && (
                  <span
                    className={
                      "rounded-md px-1.5 py-0.5 text-[10px] font-extrabold " +
                      (manual ? "bg-[#FBF3D9] text-[#5C4400]" : "bg-green-50 text-[#14512D]")
                    }
                  >
                    {manual ? "ידני" : "אוטומטי"}
                  </span>
                )}
                {manual && !m.is_final && (
                  <button type="button" onClick={() => backToAuto(m)} className="text-[11px] font-bold text-pitch-600 underline">
                    חזרה לאוטומטי
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => toggleMain(m)}
                disabled={!roundOpen}
                aria-pressed={m.is_main_event}
                aria-label={m.is_main_event ? "המשחק המרכזי של המחזור (לחיצה מבטלת)" : "סימון כמשחק המרכזי של המחזור"}
                className={
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full disabled:cursor-not-allowed " +
                  (m.is_main_event ? "bg-gold" : "border-[1.5px] border-line bg-white disabled:opacity-40")
                }
              >
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill={m.is_main_event ? "#2A2005" : "#B9C2BB"}>
                  <path d="M3 9l4.6 3.6L12 5.5l4.4 7.1L21 9l-1.8 9H4.8z" />
                  <rect x="4.8" y="19.2" width="14.4" height="2" rx="1" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <Crest team={m.home_team} />
                <span className="truncate text-[13px] font-bold">{shortTeamName(m.home_team)}</span>
              </div>
              <div className="flex items-center gap-[5px]">
                {(["home", "away"] as const).map((side, i) => (
                  <span key={side} className="contents">
                    {i === 1 && <span className="font-display text-lg text-[#A3A39B]">:</span>}
                    <input
                      value={e[side]}
                      onChange={(ev) => setScore(m, side, ev.target.value)}
                      disabled={pre}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={2}
                      placeholder="–"
                      aria-label={`שערים ל${side === "home" ? m.home_team : m.away_team}`}
                      className={
                        "h-11 w-[42px] rounded-[10px] border-[1.5px] text-center font-display text-[22px] font-bold text-ink outline-none disabled:cursor-not-allowed " +
                        inputCls
                      }
                    />
                  </span>
                ))}
              </div>
              <div className="flex min-w-0 items-center justify-end gap-1.5">
                <span className="truncate text-[13px] font-bold">{shortTeamName(m.away_team)}</span>
                <Crest team={m.away_team} />
              </div>
            </div>

            {!pre && (
              <label className="flex items-center gap-1.5 self-start text-xs font-semibold text-muted">
                <input
                  type="checkbox"
                  checked={e.final}
                  onChange={(ev) => edit(m, { final: ev.target.checked })}
                  className="h-4 w-4 accent-pitch-600"
                />
                המשחק הסתיים (תוצאה סופית)
              </label>
            )}
          </div>
        );
      })}

      {message && (
        <p className={"text-center text-sm font-semibold " + (message.error ? "text-danger" : "text-pitch-600")}>{message.text}</p>
      )}

      <button
        type="button"
        disabled={dirty.length === 0 || saving}
        onClick={saveAll}
        className="min-h-[50px] rounded-xl bg-pitch-800 text-[15px] font-extrabold text-chalk enabled:hover:bg-pitch-900 disabled:bg-[#B9C2BB]"
      >
        {saving ? "שומר..." : dirty.length > 0 ? `שמירת תוצאות (${dirty.length})` : "שמירת תוצאות"}
      </button>
      <span className="text-[11px] text-muted">
        תוצאה שנשמרת כאן מסומנת ״ידני״ והעדכון האוטומטי לא ידרוס אותה. ״חזרה לאוטומטי״ מחזיר את המשחק לעדכון החי.
      </span>
    </>
  );
}
