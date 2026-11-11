"use client";

import { sendGAEvent } from "@next/third-parties/google";
import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import LoadingScreen from "@/components/LoadingScreen";
import { scrollToNextUnpredicted } from "@/components/FloatingCountdown";
import { ChevronIcon } from "@/components/icons";
import RoundApprovalStatus, { ApprovalChip } from "@/components/RoundApprovalStatus";
import InstallPrompt, { shouldOfferInstall } from "@/components/InstallPrompt";
import RoundIntroPopup from "@/components/RoundIntroPopup";
import TopBar from "@/components/TopBar";
import MatchCard, { type ScorePair } from "@/components/predictions/MatchCard";
import type { StandingsEntry } from "@/components/predictions/MatchParticipantsList";
import { createClient } from "@/lib/supabase/client";
import { formatIsraelDayLabel, formatIsraelDeadline, israelDateKey } from "@/lib/israelTime";
import { lockExpiredRounds } from "@/lib/lockExpiredRounds";
import { liveMinuteLabel, matchStatus, type LiveClock } from "@/lib/matchStatus";
import { useScoringRules } from "@/lib/scoring";

type DbMatch = {
  id: string;
  home_team: string;
  away_team: string;
  kickoff_at: string;
  home_score: number | null;
  away_score: number | null;
  is_final: boolean;
  is_main_event: boolean;
} & LiveClock;

const MATCH_COLUMNS =
  "id, home_team, away_team, kickoff_at, home_score, away_score, is_final, is_main_event, live_status, live_minute, live_extra, live_updated_at";

type DbRound = {
  id: string;
  round_number: number;
  deadline_at: string;
  status: string;
  predictions_open_at: string | null;
};

type SavedPrediction = ScorePair & { isDefault: boolean; pointsEarned: number | null };

type RawRoundParticipationRow = {
  user_id: string;
  rank: number | null;
  users: { full_name: string; nickname: string | null; avatar: string | null } | null;
};

const EMPTY: ScorePair = { home: "", away: "" };

// "משחקי יום ראשון ננעלים בעוד 22:41:08" — ticks every second, only while
// the round is under way and a later day can still be predicted.
function DayLockCountdown({ dayLabel, lockAt }: { dayLabel: string; lockAt: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, Math.floor((lockAt - now) / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  const text = `${pad(Math.floor(left / 3600))}:${pad(Math.floor((left % 3600) / 60))}:${pad(left % 60)}`;

  return (
    <div className="flex items-center gap-2.5 rounded-[14px] border border-line bg-white px-3 py-2.5">
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1B6B3C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="13.5" r="7.5" />
        <path d="M12 9.5v4l2.5 1.6" />
        <path d="M9.5 2.5h5M12 2.5v3.5" />
      </svg>
      <span className="text-[13px] font-semibold text-[#3F4B43]">משחקי {dayLabel} ננעלים בעוד</span>
      <span dir="ltr" className="ms-auto font-display text-lg font-bold tracking-[.02em] tabular-nums">
        {text}
      </span>
    </div>
  );
}

export default function PredictionsPage() {
  const [supabase] = useState(() => createClient());
  const rules = useScoringRules();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [showInstall, setShowInstall] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [rounds, setRounds] = useState<DbRound[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [matches, setMatches] = useState<DbMatch[]>([]);
  // What's typed in the inputs vs. what's stored in the DB.
  const [entries, setEntries] = useState<Record<string, ScorePair>>({});
  const [saved, setSaved] = useState<Record<string, SavedPrediction>>({});
  const [standingsOrder, setStandingsOrder] = useState<StandingsEntry[]>([]);
  const [now, setNow] = useState(() => new Date());
  // Whether this user already had a prediction for this round when it
  // loaded, or saved during this visit — a save then counts as an update
  // for the update-predictions-click GA event.
  const [hadPredictionsAtLoad, setHadPredictionsAtLoad] = useState(false);
  const [hasSavedThisVisit, setHasSavedThisVisit] = useState(false);

  // Drives the not-started -> live transition while the page is open.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Load every round once; default to whichever one is 'open'.
  useEffect(() => {
    (async () => {
      await lockExpiredRounds(supabase);

      const [{ data, error: roundsError }, { data: auth }] = await Promise.all([
        supabase
          .from("rounds")
          .select("id, round_number, deadline_at, status, predictions_open_at")
          .order("round_number", { ascending: true }),
        supabase.auth.getUser(),
      ]);
      setUserId(auth.user?.id ?? null);

      if (roundsError) {
        setError(roundsError.message);
        setLoading(false);
        return;
      }

      const roundList = data ?? [];
      setRounds(roundList);
      const openRound = roundList.find((r) => r.status === "open") ?? roundList[roundList.length - 1];
      if (openRound) setSelectedRoundId(openRound.id);
      else setLoading(false);
    })();
  }, [supabase]);

  // Whenever the selected round changes, load its matches + this user's
  // predictions for it.
  useEffect(() => {
    if (!selectedRoundId) return;
    setLoading(true);

    (async () => {
      const { data: matchRows, error: matchesError } = await supabase
        .from("matches")
        .select(MATCH_COLUMNS)
        .eq("round_id", selectedRoundId)
        .order("kickoff_at");

      if (matchesError) {
        setError(matchesError.message);
        setLoading(false);
        return;
      }

      const matchList = matchRows ?? [];
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let predictionRows: {
        match_id: string;
        pred_home_score: number;
        pred_away_score: number;
        points_earned: number | null;
        is_default: boolean;
      }[] = [];
      if (user && matchList.length > 0) {
        const { data } = await supabase
          .from("predictions")
          .select("match_id, pred_home_score, pred_away_score, points_earned, is_default")
          .eq("user_id", user.id)
          .in("match_id", matchList.map((m) => m.id));
        predictionRows = data ?? [];
      }

      const nextSaved: Record<string, SavedPrediction> = {};
      predictionRows.forEach((p) => {
        nextSaved[p.match_id] = {
          home: String(p.pred_home_score),
          away: String(p.pred_away_score),
          isDefault: p.is_default,
          pointsEarned: p.points_earned,
        };
      });
      const nextEntries: Record<string, ScorePair> = {};
      matchList.forEach((m) => {
        const s = nextSaved[m.id];
        nextEntries[m.id] = s ? { home: s.home, away: s.away } : EMPTY;
      });

      setMatches(matchList);
      setSaved(nextSaved);
      setEntries(nextEntries);
      setHadPredictionsAtLoad(predictionRows.length > 0);
      setHasSavedThisVisit(false);
      setError(null);
      setLoading(false);
    })();
  }, [supabase, selectedRoundId]);

  // Arriving from the floating countdown on another page (?focus=next):
  // jump to the first match still waiting for a prediction.
  useEffect(() => {
    if (loading) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("focus") !== "next") return;
    requestAnimationFrame(() => scrollToNextUnpredicted());
    window.history.replaceState(null, "", window.location.pathname);
  }, [loading]);

  // While a match is live, re-read this round's scores, live minutes and the
  // user's points every minute. Only match rows and points_earned are
  // refreshed: predictions being typed into editable matches are left alone.
  const hasLiveMatch = matches.some((m) => matchStatus(m.kickoff_at, m.is_final, now) === "live");
  useEffect(() => {
    if (!selectedRoundId || !hasLiveMatch) return;

    const t = setInterval(async () => {
      const { data: fresh } = await supabase
        .from("matches")
        .select(MATCH_COLUMNS)
        .eq("round_id", selectedRoundId)
        .order("kickoff_at");
      if (!fresh) return;
      setMatches(fresh);

      if (!userId || fresh.length === 0) return;
      const { data: points } = await supabase
        .from("predictions")
        .select("match_id, points_earned")
        .eq("user_id", userId)
        .in("match_id", fresh.map((m) => m.id));
      if (!points) return;
      setSaved((prev) => {
        const next = { ...prev };
        points.forEach((p) => {
          if (next[p.match_id]) next[p.match_id] = { ...next[p.match_id], pointsEarned: p.points_earned };
        });
        return next;
      });
    }, 60_000);
    return () => clearInterval(t);
  }, [supabase, selectedRoundId, hasLiveMatch, userId]);

  // Round standings order, fetched once per round and shared by every card's
  // "everyone's predictions" drawer — same rank as /leaderboard.
  useEffect(() => {
    if (!selectedRoundId) return;

    (async () => {
      const { data } = await supabase
        .from("round_participation")
        .select("user_id, rank, users(full_name, nickname, avatar)")
        .eq("round_id", selectedRoundId)
        .overrideTypes<RawRoundParticipationRow[], { merge: false }>();

      setStandingsOrder(
        [...(data ?? [])]
          .sort((a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER))
          .map((r) => ({
            userId: r.user_id,
            name: r.users?.nickname ?? r.users?.full_name ?? "Unknown",
            avatar: r.users?.avatar ?? null,
          }))
      );
    })();
  }, [supabase, selectedRoundId]);

  const selectedRound = rounds.find((r) => r.id === selectedRoundId) ?? null;
  const isOpenRound = selectedRound?.status === "open";

  // null predictions_open_at means no restriction.
  const predictionsOpen =
    !selectedRound?.predictions_open_at || now >= new Date(selectedRound.predictions_open_at);

  const selectedRoundIndex = rounds.findIndex((r) => r.id === selectedRoundId);
  const previousRound = selectedRoundIndex > 0 ? rounds[selectedRoundIndex - 1] : null;
  const nextRound =
    selectedRoundIndex >= 0 && selectedRoundIndex < rounds.length - 1 ? rounds[selectedRoundIndex + 1] : null;

  // Per-day locking: a whole Israel calendar day locks once that day's own
  // earliest kickoff passes, independent of the round's other days.
  const earliestKickoffByDay = new Map<string, number>();
  matches.forEach((m) => {
    const day = israelDateKey(m.kickoff_at);
    const t = new Date(m.kickoff_at).getTime();
    const earliest = earliestKickoffByDay.get(day);
    if (earliest === undefined || t < earliest) earliestKickoffByDay.set(day, t);
  });
  function isDayLocked(m: DbMatch) {
    const earliest = earliestKickoffByDay.get(israelDateKey(m.kickoff_at));
    return earliest !== undefined && now.getTime() >= earliest;
  }

  const editableMatches = predictionsOpen ? matches.filter((m) => !isDayLocked(m)) : [];
  const isFilled = (e: ScorePair | undefined) => !!e && e.home !== "" && e.away !== "";
  const isStored = (id: string) => {
    const e = entries[id];
    const s = saved[id];
    return isFilled(e) && !!s && s.home === e.home && s.away === e.away;
  };
  const dirtyMatches = editableMatches.filter((m) => isFilled(entries[m.id]) && !isStored(m.id));
  // Saving needs every still-editable match filled in (house rule).
  const missingCount = editableMatches.filter((m) => !isFilled(entries[m.id])).length;
  const allFilled = editableMatches.length > 0 && missingCount === 0;
  const storedCount = matches.filter((m) => saved[m.id]).length;

  // Live first, then upcoming, then ended. Kickoff order within each group
  // (stable sort), except ended matches: the ones that earned the most
  // points come first.
  const STATUS_ORDER = { live: 0, "not-started": 1, ended: 2 } as const;
  const statusOf = (m: DbMatch) => matchStatus(m.kickoff_at, m.is_final, now);
  const sortedMatches = [...matches].sort((a, b) => {
    const sa = statusOf(a);
    const sb = statusOf(b);
    if (sa !== sb) return STATUS_ORDER[sa] - STATUS_ORDER[sb];
    if (sa !== "ended") return 0;
    return (saved[b.id]?.pointsEarned ?? 0) - (saved[a.id]?.pointsEarned ?? 0);
  });
  const GROUP_LABEL = { live: "בשידור חי", "not-started": "המשחקים הבאים", ended: "משחקים שהסתיימו" } as const;

  const firstKickoff = matches.length > 0 ? new Date(matches[0].kickoff_at).getTime() : null;
  const roundStarted = firstKickoff !== null && now.getTime() >= firstKickoff;
  // Next day that will lock (only meaningful once the round is under way —
  // before that the floating countdown covers it).
  const nextLock = roundStarted
    ? [...earliestKickoffByDay.values()].filter((t) => t > now.getTime()).sort((a, b) => a - b)[0]
    : undefined;

  function setScore(matchId: string, side: "home" | "away", value: string) {
    if (value !== "" && !/^\d$/.test(value)) return;
    setJustSaved(false);
    setEntries((prev) => ({ ...prev, [matchId]: { ...prev[matchId], [side]: value } }));
  }

  async function sendPrediction() {
    if (!allFilled || dirtyMatches.length === 0) return;
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

    // Submitting predictions registers the player on the manager's approval
    // list. ignoreDuplicates: an existing status is never touched.
    const { error: participationError } = await supabase
      .from("round_participation")
      .upsert(
        { user_id: user.id, round_id: selectedRoundId, payment_status: "waiting" },
        { onConflict: "user_id,round_id", ignoreDuplicates: true }
      );

    if (participationError) {
      setError(participationError.message);
      setSaving(false);
      return;
    }

    // Only fully-filled, changed, still-editable matches — never a locked
    // day, and never a half-typed score (Number("") would store 0).
    const toSave = dirtyMatches.map((m) => ({ id: m.id, ...entries[m.id] }));
    const rows = toSave.map((m) => ({
      user_id: user.id,
      match_id: m.id,
      pred_home_score: Number(m.home),
      pred_away_score: Number(m.away),
    }));

    const { error: upsertError } = await supabase.from("predictions").upsert(rows, { onConflict: "user_id,match_id" });

    if (upsertError) {
      setError(upsertError.message);
      setSaving(false);
      return;
    }

    setSaved((prev) => {
      const next = { ...prev };
      toSave.forEach((m) => {
        next[m.id] = { home: m.home, away: m.away, isDefault: false, pointsEarned: null };
      });
      return next;
    });

    const firstSave = !hadPredictionsAtLoad && !hasSavedThisVisit;
    if (!firstSave) {
      sendGAEvent("event", "update-predictions-click");
    }
    setHasSavedThisVisit(true);
    setSaving(false);
    setJustSaved(true);
    // First time this round's predictions are sent: offer to save the game
    // to the home screen (unless installed or "don't show again").
    if (firstSave && shouldOfferInstall()) setShowInstall(true);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center px-4 pt-[60px]">
        <TopBar />
        <LoadingScreen />
      </main>
    );
  }

  if (!selectedRound) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 pt-20 text-center">
        <TopBar />
        <p className="text-sm text-muted">אין עדיין מחזור פתוח.</p>
        <BottomNav />
      </main>
    );
  }

  const nextLockDay =
    nextLock !== undefined
      ? formatIsraelDayLabel(new Date(nextLock).toISOString()).split(" · ")[0]
      : null;

  return (
    <main className="flex min-h-screen flex-col items-center px-4 pb-32 pt-[60px]">
      <TopBar />
      <RoundIntroPopup />
      {showInstall && <InstallPrompt onClose={() => setShowInstall(false)} />}

      <div className="flex w-full max-w-md flex-col gap-3 pt-4">

        {/* Round header */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button
                onClick={() => previousRound && setSelectedRoundId(previousRound.id)}
                disabled={!previousRound}
                aria-label="מחזור קודם"
                className="flex h-9 w-7 items-center justify-center text-muted enabled:hover:text-ink disabled:opacity-25"
              >
                <ChevronIcon size={18} className="rotate-180" />
              </button>
              <h1 className="text-[26px] font-extrabold leading-none">מחזור {selectedRound.round_number}</h1>
              <button
                onClick={() => nextRound && setSelectedRoundId(nextRound.id)}
                disabled={!nextRound}
                aria-label="מחזור הבא"
                className="flex h-9 w-7 items-center justify-center text-muted enabled:hover:text-ink disabled:opacity-25"
              >
                <ChevronIcon size={18} />
              </button>
            </div>
            {isOpenRound && <ApprovalChip />}
          </div>

          {nextLock !== undefined && nextLockDay && editableMatches.length > 0 ? (
            <DayLockCountdown dayLabel={nextLockDay} lockAt={nextLock} />
          ) : !roundStarted && matches.length > 0 ? (
            <span className="text-[13px] font-semibold text-muted">
              {matches.length} משחקים · נשמרו {storedCount} מתוך {matches.length}
            </span>
          ) : (
            <span className="text-[13px] font-semibold text-muted">
              {matches.length} משחקים · ההגשה {isOpenRound ? "נסגרת" : "נסגרה"} {formatIsraelDeadline(selectedRound.deadline_at)}
            </span>
          )}
        </section>

        {isOpenRound && <RoundApprovalStatus />}

        {isOpenRound && !predictionsOpen && selectedRound.predictions_open_at && (
          <div className="rounded-2xl border border-[#EAD9A6] bg-cream p-4 text-sm font-semibold text-[#6E5200]">
            הגשת הניחושים למחזור {selectedRound.round_number} תיפתח ב־
            {formatIsraelDeadline(selectedRound.predictions_open_at)}. אפשר כבר עכשיו לשלם בפייבוקס ולהמתין לאישור.
          </div>
        )}

        {/* Feed: live → upcoming → ended. Upcoming matches get one divider
            per day; live and ended get a single group divider. */}
        <div className="flex flex-col gap-3 pt-2">
          {sortedMatches.map((m, i) => {
            const status = statusOf(m);
            const prev = i > 0 ? sortedMatches[i - 1] : null;
            const prevStatus = prev ? statusOf(prev) : null;
            const divider =
              status === "not-started"
                ? prevStatus !== "not-started" || israelDateKey(prev!.kickoff_at) !== israelDateKey(m.kickoff_at)
                  ? formatIsraelDayLabel(m.kickoff_at)
                  : null
                : prevStatus !== status
                ? GROUP_LABEL[status]
                : null;
            const s = saved[m.id];
            return (
              <div key={m.id} className="flex flex-col gap-3">
                {divider && (
                  <span className={"flex items-center gap-2.5 text-[13px] font-extrabold text-[#3F4B43] after:h-px after:flex-1 after:bg-line after:content-[''] " + (i > 0 ? "mt-1.5" : "")}>
                    {divider}
                  </span>
                )}
                <MatchCard
                  matchId={m.id}
                  homeTeam={m.home_team}
                  awayTeam={m.away_team}
                  kickoffAt={m.kickoff_at}
                  status={status}
                  homeScore={m.home_score}
                  awayScore={m.away_score}
                  liveMinute={status === "live" ? liveMinuteLabel(m, now) : null}
                  isMainEvent={m.is_main_event}
                  entry={entries[m.id] ?? EMPTY}
                  saved={s ? { home: s.home, away: s.away } : null}
                  isDefault={s?.isDefault ?? false}
                  pointsEarned={s?.pointsEarned ?? null}
                  editable={predictionsOpen && !isDayLocked(m)}
                  notOpenYetLabel={
                    !predictionsOpen && selectedRound.predictions_open_at
                      ? formatIsraelDeadline(selectedRound.predictions_open_at)
                      : null
                  }
                  onChange={(side, v) => setScore(m.id, side, v)}
                  rules={rules}
                  standingsOrder={standingsOrder}
                  currentUserId={userId}
                />
              </div>
            );
          })}
        </div>

        {editableMatches.length > 0 && (
          <div className="flex flex-col items-stretch gap-1.5 pt-3">
            <button
              disabled={!allFilled || dirtyMatches.length === 0 || saving}
              onClick={sendPrediction}
              className="h-[52px] rounded-[14px] bg-pitch-800 text-base font-extrabold text-chalk enabled:hover:bg-pitch-900 disabled:bg-[#B9C2BB]"
            >
              {saving
                ? "שומר..."
                : !allFilled
                ? "השלימו את כל הניחושים"
                : justSaved && dirtyMatches.length === 0
                ? "נשמר ✓"
                : "שמירת ניחושים"}
            </button>
            <span className="text-center text-xs font-semibold text-[#6E5200]">
              {missingCount === 0
                ? ""
                : missingCount === 1
                ? "עוד משחק אחד מחכה לניחוש שלך — אפשר לשמור רק כשכל המשחקים מנוחשים"
                : `עוד ${missingCount} משחקים מחכים לניחוש שלך — אפשר לשמור רק כשכל המשחקים מנוחשים`}
            </span>
          </div>
        )}

        {error && <p className="text-center text-sm text-danger">{error}</p>}
      </div>

      <BottomNav />
    </main>
  );
}
