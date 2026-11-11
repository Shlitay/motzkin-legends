"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import LoadingScreen from "@/components/LoadingScreen";
import { ENTRY_FEE_ILS } from "@/components/JackpotBadge";
import Logo from "@/components/Logo";
import FeedSection, { useScoreFeed } from "@/components/manager/FeedSection";
import MessageSection from "@/components/manager/MessageSection";
import ResultsSection, { type ManagerMatch } from "@/components/manager/ResultsSection";
import ScoringSection from "@/components/manager/ScoringSection";
import Section, { Switch } from "@/components/manager/Section";
import { getCurrentRound } from "@/lib/currentRound";
import { lockExpiredRounds } from "@/lib/lockExpiredRounds";
import { matchStatus } from "@/lib/matchStatus";
import { DEFAULT_RULES, type ScoringRules } from "@/lib/scoring";
import { createClient } from "@/lib/supabase/client";

type Participant = { participationId: string; userId: string; name: string; avatar: string | null };

type RawParticipationRow = {
  id: string;
  user_id: string;
  payment_status: string;
  users: { full_name: string; nickname: string | null; avatar: string | null } | null;
};

type SectionId = "participants" | "results" | "feed" | "scoring" | "message";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "participants", label: "משתתפים" },
  { id: "results", label: "תוצאות" },
  { id: "feed", label: "עדכון אוטומטי" },
  { id: "scoring", label: "ניקוד" },
  { id: "message", label: "הודעת מחזור" },
];

const ic = {
  "aria-hidden": true,
  width: 17,
  height: 17,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const ICONS: Record<SectionId, React.ReactNode> = {
  participants: (
    <svg {...ic}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5" />
    </svg>
  ),
  results: (
    <svg {...ic}>
      <rect x="3" y="5" width="7" height="14" rx="2" />
      <rect x="14" y="5" width="7" height="14" rx="2" />
    </svg>
  ),
  feed: (
    <svg {...ic}>
      <path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3" />
      <path d="M18 3v4h-4M6 21v-4h4" />
    </svg>
  ),
  scoring: (
    <svg {...ic}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" />
    </svg>
  ),
  message: (
    <svg {...ic}>
      <path d="M4 5h16v11H8l-4 4z" />
    </svg>
  ),
};

export default function ManagerDashboard() {
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roundId, setRoundId] = useState<string | null>(null);
  const [roundNumber, setRoundNumber] = useState<number | null>(null);
  const [roundStatus, setRoundStatus] = useState<string | null>(null);
  const [waiting, setWaiting] = useState<Participant[]>([]);
  const [approved, setApproved] = useState<Participant[]>([]);
  const [matches, setMatches] = useState<ManagerMatch[]>([]);
  const [rules, setRules] = useState<ScoringRules | null>(null);
  const [seenCount, setSeenCount] = useState<number | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [open, setOpen] = useState<Record<SectionId, boolean>>({
    participants: false,
    results: false,
    feed: false,
    scoring: false,
    message: false,
  });
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const feed = useScoreFeed();

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const loadMatches = useCallback(
    async (id: string) => {
      const { data, error: matchesError } = await supabase
        .from("matches")
        .select("id, home_team, away_team, kickoff_at, home_score, away_score, is_final, is_main_event, result_source")
        .eq("round_id", id)
        .order("kickoff_at");
      if (matchesError) setError(matchesError.message);
      else setMatches((data ?? []) as ManagerMatch[]);
    },
    [supabase]
  );

  useEffect(() => {
    (async () => {
      await lockExpiredRounds(supabase);
      const round = await getCurrentRound(supabase);
      if (!round) {
        setError("אין עדיין אף מחזור.");
        setLoading(false);
        return;
      }
      setRoundId(round.id);
      setRoundNumber(round.round_number);
      setRoundStatus(round.status);

      const [{ data: rows, error: rowsError }, , { data: rule }, { count: seen }] = await Promise.all([
        supabase
          .from("round_participation")
          .select("id, user_id, payment_status, users(full_name, nickname, avatar)")
          .eq("round_id", round.id)
          .overrideTypes<RawParticipationRow[], { merge: false }>(),
        loadMatches(round.id),
        supabase
          .from("scoring_rules")
          .select("win_hit_points, win_towards_points, same_diff_bonus_points, draw_hit_points, draw_towards_points")
          .order("effective_from", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("round_intro_seen").select("user_id", { count: "exact", head: true }).eq("round_id", round.id),
      ]);

      if (rowsError) {
        setError(rowsError.message);
        setLoading(false);
        return;
      }

      const toParticipant = (row: RawParticipationRow): Participant => ({
        participationId: row.id,
        userId: row.user_id,
        name: row.users?.nickname ?? row.users?.full_name ?? "לא ידוע",
        avatar: row.users?.avatar ?? null,
      });
      const all = rows ?? [];
      setWaiting(all.filter((r) => r.payment_status === "waiting").map(toParticipant));
      setApproved(all.filter((r) => r.payment_status === "approved").map(toParticipant));
      setRules(
        rule
          ? {
              winHit: rule.win_hit_points,
              winTowards: rule.win_towards_points,
              sameDiffBonus: rule.same_diff_bonus_points,
              drawHit: rule.draw_hit_points,
              drawTowards: rule.draw_towards_points,
            }
          : DEFAULT_RULES
      );
      setSeenCount(seen ?? null);
      setLoading(false);
    })();
  }, [supabase, loadMatches]);

  async function setPaymentStatus(participationId: string, status: "waiting" | "approved" | "rejected") {
    const { error: updateError } = await supabase
      .from("round_participation")
      .update({ payment_status: status })
      .eq("id", participationId);
    setError(updateError ? updateError.message : null);
    return !updateError;
  }

  async function approve(person: Participant) {
    if (!(await setPaymentStatus(person.participationId, "approved"))) return;
    setWaiting((w) => w.filter((p) => p.participationId !== person.participationId));
    setApproved((a) => [...a, person]);
    // Backfills default predictions for matches that already kicked off
    // (approval after the round locked), then recomputes standings. No-op
    // for an on-time approval.
    if (roundId) {
      const { error: backfillError } = await supabase.rpc("backfill_late_approval", {
        p_round_id: roundId,
        p_user_id: person.userId,
      });
      if (backfillError) setError(backfillError.message);
    }
  }

  async function unapprove(person: Participant) {
    if (!(await setPaymentStatus(person.participationId, "waiting"))) return;
    setApproved((a) => a.filter((p) => p.participationId !== person.participationId));
    setWaiting((w) => [...w, person]);
  }

  // Clears someone off the waiting list WITHOUT deleting their row: every
  // waiting row has real predictions attached, and a hard delete orphaned
  // standings data before (rounds 3 and 5 — see fix-round3/5-missing-
  // participation.sql). Don't reintroduce the delete.
  async function removeFromWaiting(person: Participant) {
    if (!(await setPaymentStatus(person.participationId, "rejected"))) return;
    setWaiting((w) => w.filter((p) => p.participationId !== person.participationId));
  }

  // Moves everyone approved back to waiting — cleanup once the round is
  // finished, behind a confirm step.
  async function resetAllApproved() {
    if (!roundId) return;
    setResetting(true);
    const { error: updateError } = await supabase
      .from("round_participation")
      .update({ payment_status: "waiting" })
      .eq("round_id", roundId)
      .eq("payment_status", "approved");
    setResetting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setWaiting((w) => [...w, ...approved]);
    setApproved([]);
    setConfirmReset(false);
  }

  const toggle = (id: SectionId) => setOpen((o) => ({ ...o, [id]: !o[id] }));
  const allOpen = SECTIONS.every((s) => open[s.id]);
  const jump = (id: SectionId) => {
    setOpen((o) => ({ ...o, [id]: true }));
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const statuses = matches.map((m) => matchStatus(m.kickoff_at, m.is_final, now));
  const liveCount = statuses.filter((s) => s === "live").length;
  const endedCount = statuses.filter((s) => s === "ended").length;
  const pot = approved.length * ENTRY_FEE_ILS;

  const header = (
    <header className="fixed inset-x-0 top-0 z-40 flex h-[60px] items-center justify-between bg-pitch-800 px-4">
      <Link href="/manager" aria-label="Prediction Legends – פאנל ניהול">
        <Logo />
      </Link>
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-[5px] rounded-full border-[1.5px] border-[#8A6A12] px-[9px] py-1 text-[11px] font-extrabold text-[#E8C65A]">
          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9l4.6 3.6L12 5.5l4.4 7.1L21 9l-1.8 9H4.8z" />
          </svg>
          מנהל
        </span>
        <Link href="/predictions" className="inline-flex min-h-10 items-center gap-1 text-[13px] font-extrabold text-chalk">
          למשחק
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>
      </div>
    </header>
  );

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center pt-[60px]">
        {header}
        <LoadingScreen />
      </main>
    );
  }

  const feedChip = feed.state
    ? feed.state.paused
      ? { label: "מושהה", tone: "grey" as const }
      : { label: "פעיל", tone: "green" as const }
    : null;

  return (
    <main className="flex min-h-screen flex-col items-center px-4 pb-10 pt-[60px]">
      {header}

      <div className="flex w-full max-w-md flex-col gap-3.5 pt-4">
        {/* round overview */}
        <section className="flex flex-col gap-3.5 rounded-[22px] bg-pitch-800 p-4 text-chalk">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-[#B9D3C1]">ברוך שובך</span>
              <h1 className="font-display text-[34px] font-bold leading-none">
                {roundNumber ? `מחזור ${roundNumber}` : "אין מחזור"}
              </h1>
            </div>
            {liveCount > 0 && (
              <span className="inline-flex items-center gap-[5px] rounded-full bg-pitch-600 px-[9px] py-[3px] text-[11px] font-extrabold text-white">
                <span className="pl-pulse h-[7px] w-[7px] rounded-full bg-[#9CE3B4]" />
                {liveCount === 1 ? "משחק חי" : `${liveCount} משחקים חיים`}
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { n: String(approved.length), l: "אושרו", cls: "" },
              { n: String(waiting.length), l: "ממתינים", cls: "text-[#E8C65A]" },
              { n: `₪${pot}`, l: "קופה", cls: "text-gold" },
              { n: `${endedCount}/${matches.length}`, l: "הסתיימו", cls: "" },
            ].map((t) => (
              <div key={t.l} className="flex flex-col items-center gap-0.5 rounded-xl border border-pitch-line bg-white/[.07] px-1 py-2">
                <span className={"font-display text-[22px] font-bold leading-none " + t.cls}>{t.n}</span>
                <span className="text-[10px] font-bold text-[#B9D3C1]">{t.l}</span>
              </div>
            ))}
          </div>
          <span className="text-[11px] text-[#9CCAAE]">
            הקופה מחושבת אוטומטית: ‎{approved.length} מאושרים × ‎{ENTRY_FEE_ILS} ש״ח
          </span>
        </section>

        <nav aria-label="אזורי הפאנל" className="flex flex-wrap gap-1.5">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => jump(s.id)}
              className={
                "inline-flex min-h-9 items-center whitespace-nowrap rounded-full px-3 text-[13px] font-extrabold " +
                (open[s.id] ? "bg-pitch-800 text-chalk" : "border border-line bg-white text-ink")
              }
            >
              {s.label}
            </button>
          ))}
        </nav>
        <div className="-mt-1.5 flex justify-end">
          <button
            type="button"
            onClick={() => setOpen(Object.fromEntries(SECTIONS.map((s) => [s.id, !allOpen])) as Record<SectionId, boolean>)}
            className="min-h-9 px-1 text-xs font-extrabold text-pitch-600"
          >
            {allOpen ? "לסגור הכול" : "לפתוח הכול"}
          </button>
        </div>

        {error && <p className="text-center text-sm font-semibold text-danger">{error}</p>}

        {roundId && (
          <>
            <Section
              id="participants"
              icon={ICONS.participants}
              title="משתתפים"
              chip={
                waiting.length > 0
                  ? { label: `${waiting.length} ממתינים`, tone: "gold" }
                  : { label: "כולם אושרו", tone: "green" }
              }
              open={open.participants}
              onToggle={() => toggle("participants")}
            >
              <div className="bg-gold-light flex flex-col gap-0.5 rounded-2xl px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#5C4400]">ממתינים לאישור</span>
                  <span className="rounded-full bg-white px-[9px] py-0.5 font-display text-[13px] font-semibold text-[#5C4400]">
                    {waiting.length}
                  </span>
                </div>
                <span className="text-[11px] text-[#6E5200]">אשרו אחרי שהתשלום ב־Paybox התקבל</span>
                {waiting.length === 0 ? (
                  <span className="py-2.5 text-[13px] font-bold text-[#5C4400]">אין ממתינים. כולם אושרו</span>
                ) : (
                  waiting.map((p) => (
                    <div key={p.participationId} className="flex min-h-[52px] items-center gap-2.5">
                      <Avatar avatar={p.avatar} size={38} />
                      <span className="flex min-w-0 flex-1 flex-col gap-px">
                        <span className="truncate text-sm font-extrabold">{p.name}</span>
                        <span className="text-[11px] text-[#6B6F68]">הגיש/ה ניחושים · ממתין/ה לתשלום</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFromWaiting(p)}
                        className="min-h-10 rounded-xl border-[1.5px] border-[#D9C48A] px-2.5 text-xs font-extrabold text-[#3F4440]"
                      >
                        הסרה
                      </button>
                      <button
                        type="button"
                        onClick={() => approve(p)}
                        className="min-h-10 rounded-xl bg-pitch-600 px-3.5 text-[13px] font-extrabold text-white"
                      >
                        אישור
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-0.5 flex items-center justify-between">
                <span className="text-xs font-extrabold text-muted">אושרו למחזור</span>
                <span className="rounded-full bg-green-50 px-[9px] py-0.5 font-display text-[13px] font-semibold text-[#14512D]">
                  {approved.length}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {approved.map((p) => (
                  <div key={p.participationId} className="flex min-h-11 items-center gap-[7px] rounded-xl bg-chalk py-[5px] pe-[5px] ps-2">
                    <Avatar avatar={p.avatar} size={30} />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-bold">{p.name}</span>
                    <button
                      type="button"
                      onClick={() => unapprove(p)}
                      aria-label={`החזרת ${p.name} להמתנה`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#6B6F68] hover:bg-white"
                    >
                      <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 14l-5-5 5-5" />
                        <path d="M4 9h11a5 5 0 0 1 0 10h-3" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              {approved.length > 0 && <span className="text-[11px] text-[#6B6F68]">החץ מחזיר משתתף להמתנה</span>}

              {roundStatus === "finished" && approved.length > 0 && (
                <div className="flex flex-col gap-2.5 border-t border-dashed border-[#E3C2BE] pt-3">
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[13px] font-extrabold text-[#8C1D18]">איפוס משתתפים מאושרים</span>
                      <span className="text-[11px] text-[#6B6F68]">לפתיחת מחזור חדש. דורש אישור נוסף</span>
                    </div>
                    {!confirmReset && (
                      <button
                        type="button"
                        onClick={() => setConfirmReset(true)}
                        className="min-h-10 rounded-xl border-[1.5px] border-[#E8B4AF] px-2.5 text-xs font-extrabold text-danger"
                      >
                        איפוס
                      </button>
                    )}
                  </div>
                  {confirmReset && (
                    <div className="flex flex-col gap-2 rounded-xl bg-[#FDF1F0] p-3">
                      <span className="text-[13px] text-[#8C1D18]">
                        כל {approved.length} המאושרים למחזור {roundNumber} יחזרו ל״ממתינים לאישור״. אי אפשר לבטל.
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={resetting}
                          onClick={() => setConfirmReset(false)}
                          className="min-h-10 flex-1 rounded-xl border-[1.5px] border-miss bg-white text-xs font-extrabold"
                        >
                          ביטול
                        </button>
                        <button
                          type="button"
                          disabled={resetting}
                          onClick={resetAllApproved}
                          className="min-h-10 flex-1 rounded-xl bg-danger text-xs font-extrabold text-white disabled:opacity-50"
                        >
                          {resetting ? "מאפס..." : "כן, לאפס"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Section>

            <Section
              id="results"
              icon={ICONS.results}
              title="תוצאות"
              chip={{ label: `${endedCount}/${matches.length} הסתיימו`, tone: "grey" }}
              open={open.results}
              onToggle={() => toggle("results")}
            >
              <ResultsSection
                matches={matches}
                roundId={roundId}
                roundOpen={roundStatus === "open"}
                now={now}
                onChanged={() => loadMatches(roundId)}
              />
            </Section>

            <Section
              id="feed"
              icon={ICONS.feed}
              title="עדכון אוטומטי"
              chip={feedChip}
              open={open.feed}
              onToggle={() => toggle("feed")}
              extra={
                feed.state && (
                  <Switch
                    on={!feed.state.paused}
                    disabled={feed.busy}
                    onChange={feed.togglePaused}
                    label="עדכון אוטומטי"
                  />
                )
              }
            >
              <FeedSection feed={feed} now={now} hasLive={liveCount > 0} />
            </Section>

            <Section
              id="scoring"
              icon={ICONS.scoring}
              title="ניקוד"
              chip={
                rules
                  ? {
                      label: `${rules.winHit} · ${rules.winTowards} · ${rules.drawTowards} · +${rules.sameDiffBonus}`,
                      tone: "grey",
                    }
                  : null
              }
              open={open.scoring}
              onToggle={() => toggle("scoring")}
            >
              {rules && <ScoringSection key={JSON.stringify(rules)} rules={rules} onSaved={setRules} />}
            </Section>

            <Section
              id="message"
              icon={ICONS.message}
              title="הודעת מחזור"
              chip={
                seenCount !== null && approved.length > 0
                  ? { label: `נראתה ע״י ${seenCount}/${approved.length}`, tone: "grey" }
                  : null
              }
              open={open.message}
              onToggle={() => toggle("message")}
            >
              <MessageSection />
            </Section>
          </>
        )}
      </div>
    </main>
  );
}
