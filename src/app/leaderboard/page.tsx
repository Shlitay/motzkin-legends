"use client";

import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import BottomNav from "@/components/BottomNav";
import NewsTicker from "@/components/NewsTicker";
import ParticipantModal from "@/components/ParticipantModal";
import RoundApprovalStatus from "@/components/RoundApprovalStatus";
import RoundIntroPopup from "@/components/RoundIntroPopup";
import TopBar from "@/components/TopBar";
import { jackpotSplit } from "@/lib/jackpot";
import { lockExpiredRounds } from "@/lib/lockExpiredRounds";
import { matchStatus, type MatchStatus } from "@/lib/matchStatus";
import { createClient } from "@/lib/supabase/client";

type RoundRow = {
  userId: string;
  name: string;
  avatar: string | null;
  points: number;
  exact: number;
  towards: number;
  move: "up" | "down" | null;
};

type SeasonRow = {
  userId: string;
  name: string;
  avatar: string | null;
  exact: number;
  towards: number;
  rounds: number;
  points: number;
};

type DbRound = { id: string; round_number: number; deadline_at: string; status: string };

type RoundMatch = { id: string; kickoff_at: string; is_final: boolean };

type RawRoundParticipationRow = {
  user_id: string;
  total_points: number | null;
  exact_score_count: number | null;
  correct_result_count: number | null;
  rank: number | null;
  previous_rank: number | null;
  payment_status: string;
  users: { full_name: string; nickname: string | null; avatar: string | null } | null;
};

type SeasonStatsRow = {
  user_id: string;
  display_name: string;
  avatar: string | null;
  total_points: number;
  rounds_played: number;
  season_hits: number;
  season_towards: number;
};

// ---- small pieces ------------------------------------------------------------

function CrownSmall({ size = 12 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 9l4.6 3.6L12 5.5l4.4 7.1L21 9l-1.8 9H4.8z" />
      <rect x="4.8" y="19.2" width="14.4" height="2" rx="1" />
    </svg>
  );
}

function TrendSmall() {
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 16l6-6 4 4 6-6" />
    </svg>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 rounded-full bg-[#ECECE6] p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={
            "min-h-[38px] flex-1 rounded-full text-sm font-extrabold " +
            (value === o.value ? "bg-pitch-800 text-chalk" : "text-muted")
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function StatusChips({ matches, now }: { matches: RoundMatch[]; now: Date }) {
  const counts: Record<MatchStatus, number> = { "not-started": 0, live: 0, ended: 0 };
  matches.forEach((m) => counts[matchStatus(m.kickoff_at, m.is_final, now)]++);
  return (
    <div className="flex flex-wrap gap-1.5">
      {counts.ended > 0 && (
        <span className="inline-flex items-center gap-[5px] rounded-full bg-[#EFEFEA] px-2.5 py-1 text-xs font-bold text-[#3F4440]">
          <span className="h-[7px] w-[7px] rounded-full bg-[#8E918A]" />
          {counts.ended} הסתיימו
        </span>
      )}
      {counts.live > 0 && (
        <span className="inline-flex items-center gap-[5px] rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-[#14512D]">
          <span className="pl-pulse h-[7px] w-[7px] rounded-full bg-pitch-600" />
          {counts.live} בשידור חי
        </span>
      )}
      {counts["not-started"] > 0 && (
        <span className="inline-flex items-center rounded-full border border-line bg-white px-2.5 py-1 text-xs font-bold text-muted">
          {counts["not-started"]} טרם החלו
        </span>
      )}
    </div>
  );
}

const PODIUM = {
  1: {
    ring: "border-gold [--gold-border:3px]",
    size: 66,
    block: "bg-gold h-[122px]",
    rank: "text-[#5C4400]",
    pts: "text-gold-ink text-[32px]",
  },
  2: {
    ring: "border-[3px] border-[#C9CDD2] bg-white",
    size: 54,
    block: "h-[92px] bg-[linear-gradient(160deg,#E9ECEF_0%,#FFFFFF_45%,#C9CDD2_100%)]",
    rank: "text-[#55606B]",
    pts: "text-[#2E3A44] text-[26px]",
  },
  3: {
    ring: "border-[3px] border-[#C98A5A] bg-white",
    size: 54,
    block: "h-[72px] bg-[linear-gradient(160deg,#E7B48A_0%,#F6DCC4_45%,#B9774A_100%)]",
    rank: "text-[#6B3A17]",
    pts: "text-[#4A2810] text-[26px]",
  },
} as const;

function PodiumSpot({
  row,
  place,
  me,
  prize,
  onSelect,
}: {
  row: RoundRow | undefined;
  place: 1 | 2 | 3;
  me: boolean;
  prize: number;
  onSelect: (id: string) => void;
}) {
  const s = PODIUM[place];
  if (!row) return <div className="min-w-0 flex-1" />;
  return (
    <button
      type="button"
      onClick={() => onSelect(row.userId)}
      className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
      aria-label={`מקום ${place}: ${row.name}, ${row.points} נקודות`}
    >
      {place === 1 && (
        <svg aria-hidden="true" width="34" height="26" viewBox="0 0 24 18">
          <defs>
            <linearGradient id="lbCrown" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#A47A14" />
              <stop offset=".35" stopColor="#F3D36B" />
              <stop offset=".5" stopColor="#FFF3C4" />
              <stop offset=".65" stopColor="#E0BB45" />
              <stop offset="1" stopColor="#A47A14" />
            </linearGradient>
          </defs>
          <g fill="url(#lbCrown)">
            <path d="M3 6l4.6 3.6L12 2.5l4.4 7.1L21 6l-1.8 9H4.8z" />
            <circle cx="3" cy="5" r="1.6" />
            <circle cx="12" cy="1.8" r="1.7" />
            <circle cx="21" cy="5" r="1.6" />
          </g>
        </svg>
      )}
      <span
        className={"flex items-center justify-center overflow-hidden rounded-full [--gold-fill:#fff] " + s.ring}
        style={{ width: s.size, height: s.size }}
      >
        <Avatar avatar={row.avatar} size={s.size - 6} />
      </span>
      <span className="flex max-w-full items-center gap-1 text-[13px] font-extrabold text-chalk">
        <span className="truncate">{row.name}</span>
        {me && <span className="shrink-0 rounded-full bg-chalk px-1.5 py-px text-[11px] text-pitch-800">אתה</span>}
      </span>
      <span className={"flex w-full flex-col items-center gap-0.5 rounded-t-[14px] pt-2.5 " + s.block}>
        <span className={"font-display text-[13px] font-semibold " + s.rank}>{place}</span>
        <span className={"font-display font-bold leading-none " + s.pts}>{row.points}</span>
        {prize > 0 && (
          <span className={"mt-1 font-display text-xs font-semibold " + s.rank} dir="ltr">
            ₪{prize}
          </span>
        )}
      </span>
    </button>
  );
}

// ---- page --------------------------------------------------------------------

export default function LeaderboardPage() {
  const [supabase] = useState(() => createClient());

  const [tab, setTab] = useState<"round" | "season">("round");
  const [rounds, setRounds] = useState<DbRound[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [roundMatches, setRoundMatches] = useState<RoundMatch[]>([]);
  const [now, setNow] = useState(() => new Date());
  const [roundRows, setRoundRows] = useState<RoundRow[]>([]);
  const [approved, setApproved] = useState<{ userId: string; name: string; avatar: string | null }[]>([]);
  const [participantCount, setParticipantCount] = useState<number | null>(null);
  const [seasonRows, setSeasonRows] = useState<SeasonRow[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Every round once (default: the open one, else the latest) + season stats.
  useEffect(() => {
    (async () => {
      await lockExpiredRounds(supabase);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);

      const { data } = await supabase
        .from("rounds")
        .select("id, round_number, deadline_at, status")
        .order("round_number", { ascending: true });
      const roundList = data ?? [];
      setRounds(roundList);
      const openRound = roundList.find((r) => r.status === "open") ?? roundList[roundList.length - 1];
      if (openRound) setSelectedRoundId(openRound.id);

      const { data: stats } = await supabase
        .from("season_stats")
        .select("user_id, display_name, avatar, total_points, rounds_played, season_hits, season_towards")
        .overrideTypes<SeasonStatsRow[], { merge: false }>();

      // Players who never played a round are left out.
      setSeasonRows(
        (stats ?? [])
          .filter((s) => s.rounds_played > 0)
          .map((s) => ({
            userId: s.user_id,
            name: s.display_name,
            avatar: s.avatar,
            exact: s.season_hits,
            towards: s.season_towards,
            rounds: s.rounds_played,
            points: s.total_points,
          }))
          .sort((a, b) => b.points - a.points)
      );
    })();
  }, [supabase]);

  // Selected round's matches + standings.
  useEffect(() => {
    if (!selectedRoundId) return;

    (async () => {
      const { data: matchRows } = await supabase
        .from("matches")
        .select("id, kickoff_at, is_final")
        .eq("round_id", selectedRoundId);
      setRoundMatches(matchRows ?? []);

      const { data: rows } = await supabase
        .from("round_participation")
        .select(
          "user_id, total_points, exact_score_count, correct_result_count, rank, previous_rank, payment_status, users(full_name, nickname, avatar)"
        )
        .eq("round_id", selectedRoundId)
        .overrideTypes<RawRoundParticipationRow[], { merge: false }>();

      const nameOf = (r: RawRoundParticipationRow) => r.users?.nickname ?? r.users?.full_name ?? "Unknown";

      // Before the round starts nothing is ranked yet — show who's approved.
      setApproved(
        (rows ?? [])
          .filter((r) => r.payment_status === "approved")
          .map((r) => ({ userId: r.user_id, name: nameOf(r), avatar: r.users?.avatar ?? null }))
      );

      // Sort by the DB's tiebroken rank (points → exacts → main match), not
      // raw points. previous_rank is snapshotted server-side on every
      // recompute (add-rank-movement-tracking.sql).
      setRoundRows(
        [...(rows ?? [])]
          .sort((a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER))
          .map((r) => ({
            userId: r.user_id,
            name: nameOf(r),
            avatar: r.users?.avatar ?? null,
            points: r.total_points ?? 0,
            exact: r.exact_score_count ?? 0,
            towards: r.correct_result_count ?? 0,
            move:
              r.rank !== null && r.previous_rank !== null && r.rank !== r.previous_rank
                ? r.rank < r.previous_rank
                  ? "up"
                  : "down"
                : null,
          }))
      );

      // Round's participant count for the payout — a security-definer RPC,
      // not a live approved count, since /manager's reset can flip a past
      // round's statuses back to 'waiting'.
      const { data: count } = await supabase.rpc("round_participant_count", { p_round_id: selectedRoundId });
      setParticipantCount(count ?? 0);
    })();
  }, [supabase, selectedRoundId]);

  const selectedRound = rounds.find((r) => r.id === selectedRoundId) ?? null;
  const idx = rounds.findIndex((r) => r.id === selectedRoundId);
  const previousRound = idx > 0 ? rounds[idx - 1] : null;
  const nextRound = idx >= 0 && idx < rounds.length - 1 ? rounds[idx + 1] : null;

  const isFinished = selectedRound?.status === "finished";
  const isLive = selectedRound?.status === "locked";
  const split = isFinished && participantCount !== null ? jackpotSplit(participantCount) : null;

  const [first, second, third] = roundRows;
  const rest = roundRows.slice(3);
  const leader = seasonRows[0];

  return (
    <main className="flex min-h-screen flex-col items-center px-4 pb-32 pt-[60px]">
      <TopBar />
      <RoundIntroPopup />

      <div className="flex w-full max-w-md flex-col gap-3.5 pt-4">
        <NewsTicker />
        <RoundApprovalStatus />

        <div className="flex items-center justify-between gap-2">
          <h1 className="text-[26px] font-black leading-none">טבלת הליגה</h1>
          {tab === "round" && selectedRound && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="מחזור קודם"
                disabled={!previousRound}
                onClick={() => previousRound && setSelectedRoundId(previousRound.id)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white disabled:opacity-40"
              >
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#17231C" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
              <span className="text-[15px] font-extrabold">מחזור {selectedRound.round_number}</span>
              <button
                type="button"
                aria-label="מחזור הבא"
                disabled={!nextRound}
                onClick={() => nextRound && setSelectedRoundId(nextRound.id)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white disabled:opacity-40"
              >
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#17231C" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 6l-6 6 6 6" />
                </svg>
              </button>
            </div>
          )}
        </div>

        <Segmented
          label="סוג הטבלה"
          value={tab}
          onChange={setTab}
          options={[
            { value: "round", label: "המחזור" },
            { value: "season", label: "העונה" },
          ]}
        />

        {tab === "round" && selectedRound && selectedRound.status === "open" && (
          <section className="overflow-hidden rounded-[20px] border border-line bg-white">
            <div className="border-b border-[#ECECE6] bg-[#FAFAF7] px-3 py-2.5 text-xs font-extrabold text-muted">
              המחזור עוד לא התחיל · {approved.length} משתתפים מאושרים
            </div>
            {approved.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-muted">עוד אין משתתפים מאושרים.</p>
            ) : (
              approved.map((p) => (
                <button
                  key={p.userId}
                  type="button"
                  onClick={() => setSelectedUserId(p.userId)}
                  className={
                    "flex min-h-[52px] w-full items-center gap-2.5 border-b border-[#F0F0EA] px-3 text-start last:border-b-0 " +
                    (p.userId === currentUserId ? "bg-cream" : "")
                  }
                >
                  <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#F1F1EC]">
                    <Avatar avatar={p.avatar} size={36} />
                  </span>
                  <span className={"truncate text-sm " + (p.userId === currentUserId ? "font-extrabold" : "font-bold")}>
                    {p.name}
                    {p.userId === currentUserId && " (אתה)"}
                  </span>
                </button>
              ))
            )}
          </section>
        )}

        {tab === "round" && selectedRound && selectedRound.status !== "open" && (
          <>
            <StatusChips matches={roundMatches} now={now} />

            {first && (
              <section aria-label="שלושת המובילים" className="flex flex-col gap-3 overflow-hidden rounded-[22px] bg-pitch-800 px-3.5 pt-[18px]">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-extrabold text-[#CFE0D4]">
                    {isFinished ? `זוכי מחזור ${selectedRound.round_number}` : "מובילים כרגע"}
                  </span>
                  {isLive && (
                    <span className="inline-flex items-center gap-[5px] text-xs font-bold text-[#9CCAAE]">
                      <span className="pl-pulse h-[7px] w-[7px] rounded-full bg-[#6FCF97]" />
                      מתעדכן חי
                    </span>
                  )}
                  {split && (
                    <span className="text-xs font-bold text-[#9CCAAE]">
                      קופה <span dir="ltr">₪{split.pot}</span>
                    </span>
                  )}
                </div>
                <div className="flex items-end gap-2.5">
                  <PodiumSpot row={second} place={2} me={second?.userId === currentUserId} prize={split?.second ?? 0} onSelect={setSelectedUserId} />
                  <PodiumSpot row={first} place={1} me={first.userId === currentUserId} prize={split?.first ?? 0} onSelect={setSelectedUserId} />
                  <PodiumSpot row={third} place={3} me={third?.userId === currentUserId} prize={split?.third ?? 0} onSelect={setSelectedUserId} />
                </div>
              </section>
            )}

            {rest.length > 0 && (
              <section className="overflow-hidden rounded-[20px] border border-line bg-white">
                <div className="grid grid-cols-[26px_36px_minmax(0,1fr)_auto_46px] gap-2.5 border-b border-[#ECECE6] bg-[#FAFAF7] px-3 py-2.5 text-[11px] font-extrabold text-muted">
                  <span className="text-center">#</span>
                  <span />
                  <span>משתתף</span>
                  <span>בול · כיוון</span>
                  <span className="text-left">נק׳</span>
                </div>
                {rest.map((r, i) => {
                  const me = r.userId === currentUserId;
                  return (
                    <button
                      key={r.userId}
                      type="button"
                      onClick={() => setSelectedUserId(r.userId)}
                      className={
                        "grid min-h-14 w-full grid-cols-[26px_36px_minmax(0,1fr)_auto_46px] items-center gap-2.5 border-b border-[#F0F0EA] px-3 text-start last:border-b-0 " +
                        (me ? "bg-cream" : "")
                      }
                    >
                      <span className="flex flex-col items-center font-display text-[15px] font-semibold leading-none text-[#6B6F68]">
                        {i + 4}
                        {isLive && r.move && (
                          <span className={"text-[10px] " + (r.move === "up" ? "text-pitch-600" : "text-danger")}>
                            {r.move === "up" ? "▲" : "▼"}
                          </span>
                        )}
                      </span>
                      <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#F1F1EC]">
                        <Avatar avatar={r.avatar} size={36} />
                      </span>
                      <span className={"truncate text-sm " + (me ? "font-extrabold" : "font-bold")}>
                        {r.name}
                        {me && " (אתה)"}
                      </span>
                      <span className="inline-flex gap-2 font-display text-[13px] font-semibold">
                        <span className="inline-flex items-center gap-[3px] text-[#6E5200]">
                          <CrownSmall />
                          {r.exact}
                        </span>
                        <span className="inline-flex items-center gap-[3px] text-pitch-600">
                          <TrendSmall />
                          {r.towards}
                        </span>
                      </span>
                      <span className="text-left font-display text-xl font-bold">{r.points}</span>
                    </button>
                  );
                })}
              </section>
            )}

            <p className="text-center text-xs text-muted">לחיצה על משתתף פותחת את הניחושים והסטטיסטיקה שלו</p>
          </>
        )}

        {tab === "season" && (
          <>
            {leader && (
              <section className="flex items-center gap-3.5 rounded-[20px] bg-pitch-800 px-4 py-3.5 text-chalk">
                <span className="border-gold flex h-[58px] w-[58px] shrink-0 items-center justify-center overflow-hidden rounded-full [--gold-border:3px]">
                  <Avatar avatar={leader.avatar} size={52} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="inline-flex items-center gap-[5px] text-xs font-extrabold text-[#E8C65A]">
                    <CrownSmall size={13} />
                    אגדת העונה
                  </span>
                  <span className="truncate text-[19px] font-black">{leader.name}</span>
                  <span className="text-xs text-[#CFE0D4]">
                    {leader.exact} בולים · {leader.rounds} מחזורים
                  </span>
                </span>
                <span className="text-gold font-display text-[34px] font-bold leading-none">{leader.points}</span>
              </section>
            )}

            <section className="overflow-hidden rounded-[20px] border border-line bg-white">
              <div className="grid min-h-[38px] grid-cols-[24px_30px_minmax(0,1fr)_36px_36px_36px_44px] items-center gap-1.5 border-b border-[#ECECE6] bg-[#FAFAF7] px-2.5 text-[11px] font-extrabold text-muted">
                <span className="text-center">#</span>
                <span />
                <span>משתתף</span>
                <span className="text-center">בולים</span>
                <span className="text-center">כיוון</span>
                <span className="text-center">מחז׳</span>
                <span className="text-left">נק׳</span>
              </div>
              {seasonRows.map((r, i) => {
                const me = r.userId === currentUserId;
                const rankColor = ["text-[#8A6A12]", "text-[#55606B]", "text-[#8A4B22]"][i] ?? "text-[#6B6F68]";
                return (
                  <button
                    key={r.userId}
                    type="button"
                    onClick={() => setSelectedUserId(r.userId)}
                    className={
                      "grid min-h-[50px] w-full grid-cols-[24px_30px_minmax(0,1fr)_36px_36px_36px_44px] items-center gap-1.5 border-b border-[#F0F0EA] px-2.5 text-start last:border-b-0 " +
                      (me ? "bg-cream" : "")
                    }
                  >
                    <span className={"text-center font-display text-sm font-semibold " + rankColor}>{i + 1}</span>
                    <span className="flex h-[30px] w-[30px] items-center justify-center overflow-hidden rounded-full bg-[#F1F1EC]">
                      <Avatar avatar={r.avatar} size={30} />
                    </span>
                    <span className={"truncate text-sm " + (me ? "font-extrabold" : "font-semibold")}>
                      {r.name}
                      {me && " (אתה)"}
                    </span>
                    <span className="text-center font-display text-sm font-semibold text-[#6E5200]">{r.exact}</span>
                    <span className="text-center font-display text-sm font-semibold text-pitch-600">{r.towards}</span>
                    <span className="text-center font-display text-sm font-semibold text-muted">{r.rounds}</span>
                    <span className="text-left font-display text-lg font-bold">{r.points}</span>
                  </button>
                );
              })}
            </section>
          </>
        )}
      </div>

      {selectedUserId && (
        <ParticipantModal userId={selectedUserId} round={selectedRound} onClose={() => setSelectedUserId(null)} />
      )}

      <BottomNav />
    </main>
  );
}
