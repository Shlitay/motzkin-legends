"use client";

import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import NewsTicker from "@/components/NewsTicker";
import TopBar from "@/components/TopBar";
import { createClient } from "@/lib/supabase/client";
import { lockExpiredRounds } from "@/lib/lockExpiredRounds";
import { TEAM_COLORS } from "@/lib/mock-data";

type ScoreEntry = { home: string; away: string };

type DbMatch = {
  id: string;
  home_team: string;
  away_team: string;
  kickoff_at: string;
};

type DbRound = {
  id: string;
  round_number: number;
  deadline_at: string;
  status: string;
};

function formatDeadline(iso: string) {
  const d = new Date(iso);
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${day}.${month} · ${hh}:${mm}`;
}

export default function PredictionsPage() {
  const [supabase] = useState(() => createClient());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [rounds, setRounds] = useState<DbRound[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [matches, setMatches] = useState<DbMatch[]>([]);
  const [entries, setEntries] = useState<Record<string, ScoreEntry>>({});
  const [submitted, setSubmitted] = useState(false);

  // Load every round once; default to whichever one is 'open'.
  useEffect(() => {
    (async () => {
      await lockExpiredRounds(supabase);

      const { data, error: roundsError } = await supabase
        .from("rounds")
        .select("id, round_number, deadline_at, status")
        .order("round_number", { ascending: true });

      if (roundsError) {
        setError(roundsError.message);
        setLoading(false);
        return;
      }

      const roundList = data ?? [];
      setRounds(roundList);
      const openRound = roundList.find((r) => r.status === "open") ?? roundList[roundList.length - 1];
      if (openRound) {
        setSelectedRoundId(openRound.id);
      } else {
        setLoading(false);
      }
    })();
  }, [supabase]);

  // Whenever the selected round changes, load its matches + this user's
  // existing predictions for it.
  useEffect(() => {
    if (!selectedRoundId) return;
    setLoading(true);

    (async () => {
      const { data: matchRows, error: matchesError } = await supabase
        .from("matches")
        .select("id, home_team, away_team, kickoff_at")
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

      let predictionRows: { match_id: string; pred_home_score: number; pred_away_score: number }[] = [];
      if (user && matchList.length > 0) {
        const { data } = await supabase
          .from("predictions")
          .select("match_id, pred_home_score, pred_away_score")
          .eq("user_id", user.id)
          .in("match_id", matchList.map((m) => m.id));
        predictionRows = data ?? [];
      }

      const byMatch = new Map(predictionRows.map((p) => [p.match_id, p]));
      const nextEntries: Record<string, ScoreEntry> = {};
      matchList.forEach((m) => {
        const existing = byMatch.get(m.id);
        nextEntries[m.id] = existing
          ? { home: String(existing.pred_home_score), away: String(existing.pred_away_score) }
          : { home: "", away: "" };
      });

      setMatches(matchList);
      setEntries(nextEntries);
      setSubmitted(matchList.length > 0 && predictionRows.length === matchList.length);
      setError(null);
      setLoading(false);
    })();
  }, [supabase, selectedRoundId]);

  const selectedRound = rounds.find((r) => r.id === selectedRoundId) ?? null;
  const isOpenRound = selectedRound?.status === "open";

  const allFilled =
    matches.length > 0 &&
    matches.every((m) => entries[m.id]?.home !== "" && entries[m.id]?.away !== "");

  function setScore(matchId: string, side: "home" | "away", value: string) {
    if (value !== "" && !/^\d$/.test(value)) return;
    setEntries((prev) => ({ ...prev, [matchId]: { ...prev[matchId], [side]: value } }));
  }

  async function sendPrediction() {
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You've been signed out — please log in again.");
      setSaving(false);
      return;
    }

    const rows = matches.map((m) => ({
      user_id: user.id,
      match_id: m.id,
      pred_home_score: Number(entries[m.id].home),
      pred_away_score: Number(entries[m.id].away),
    }));

    const { error: upsertError } = await supabase
      .from("predictions")
      .upsert(rows, { onConflict: "user_id,match_id" });

    if (upsertError) {
      setError(upsertError.message);
      setSaving(false);
      return;
    }

    setSubmitted(true);
    setSaving(false);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 pt-28 text-center">
        <TopBar />
        <p className="text-sm text-muted">Loading…</p>
      </main>
    );
  }

  if (!selectedRound) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 pt-28 text-center">
        <TopBar />
        <p className="text-sm text-muted">No round is open for predictions yet.</p>
        <BottomNav />
      </main>
    );
  }

  const heading = !isOpenRound || submitted
    ? "Check your history predictions"
    : "Set your round matches prediction";

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-6 pb-24 pt-28">
      <TopBar />
      <NewsTicker />
      <div className="text-center">
        <h1 className="text-lg font-medium">{heading}</h1>
        <p className="mt-1 text-sm text-muted">
          Round {selectedRound.round_number} · predictions {isOpenRound ? "close" : "closed"}{" "}
          {formatDeadline(selectedRound.deadline_at)}
        </p>
      </div>

      {rounds.length > 1 && (
        <RoundPicker
          rounds={rounds}
          selectedRoundId={selectedRoundId!}
          onChange={setSelectedRoundId}
        />
      )}

      <div className="w-full max-w-md space-y-4">
        {matches.map((m) => {
          const e = entries[m.id];
          const readOnly = !isOpenRound || submitted;
          return (
            <MatchRow
              key={m.id}
              homeTeam={m.home_team}
              awayTeam={m.away_team}
              home={e.home}
              away={e.away}
              readOnly={readOnly}
              onChangeHome={readOnly ? undefined : (v) => setScore(m.id, "home", v)}
              onChangeAway={readOnly ? undefined : (v) => setScore(m.id, "away", v)}
            />
          );
        })}
      </div>

      {isOpenRound &&
        (submitted ? (
          <button
            onClick={() => setSubmitted(false)}
            className="rounded-full bg-draw px-8 py-2 font-medium text-white hover:brightness-95"
          >
            Update prediction
          </button>
        ) : (
          <button
            disabled={!allFilled || saving}
            onClick={sendPrediction}
            className="rounded-full bg-brand px-8 py-2 font-medium text-white enabled:hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            {saving ? "Saving…" : allFilled ? "Send prediction" : "Fill predictions"}
          </button>
        ))}

      {error && <p className="text-sm text-danger">{error}</p>}

      <BottomNav />
    </main>
  );
}

function RoundPicker({
  rounds,
  selectedRoundId,
  onChange,
}: {
  rounds: DbRound[];
  selectedRoundId: string;
  onChange: (id: string) => void;
}) {
  return (
    <select
      value={selectedRoundId}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-neutral-300 px-4 py-2 text-sm"
    >
      {rounds.map((r) => (
        <option key={r.id} value={r.id}>
          Round {r.round_number}
        </option>
      ))}
    </select>
  );
}

function MatchRow({
  homeTeam,
  awayTeam,
  home,
  away,
  onChangeHome,
  onChangeAway,
  readOnly = false,
}: {
  homeTeam: string;
  awayTeam: string;
  home: string;
  away: string;
  onChangeHome?: (v: string) => void;
  onChangeAway?: (v: string) => void;
  readOnly?: boolean;
}) {
  const homeNum = home === "" ? null : Number(home);
  const awayNum = away === "" ? null : Number(away);
  const hasBoth = homeNum !== null && awayNum !== null;
  const isDraw = hasBoth && homeNum === awayNum;
  const homeWins = hasBoth && homeNum! > awayNum!;
  const awayWins = hasBoth && awayNum! > homeNum!;

  const teamClass = (winning: boolean) =>
    isDraw
      ? "bg-draw/15 border-draw/45"
      : winning
      ? "bg-brand/15 border-brand/40"
      : "border-neutral-200";

  return (
    <div className="flex items-center gap-2">
      <div className={`flex flex-1 items-center gap-2 rounded-lg border px-3 py-3 text-sm ${teamClass(homeWins)}`}>
        <TeamDots team={homeTeam} />
        <span>{homeTeam}</span>
      </div>
      <ScoreBox value={home} onChange={onChangeHome} readOnly={readOnly} />
      <ScoreBox value={away} onChange={onChangeAway} readOnly={readOnly} />
      <div className={`flex flex-1 items-center justify-end gap-2 rounded-lg border px-3 py-3 text-right text-sm ${teamClass(awayWins)}`}>
        <span>{awayTeam}</span>
        <TeamDots team={awayTeam} />
      </div>
    </div>
  );
}

function TeamDots({ team }: { team: string }) {
  const colors = TEAM_COLORS[team];
  if (!colors) return null;
  return (
    <span className="flex shrink-0" aria-hidden>
      <span
        className="h-2.5 w-2.5 rounded-full border border-black/10"
        style={{ background: colors.primary }}
      />
      <span
        className="-ml-1 h-2.5 w-2.5 rounded-full border border-black/10"
        style={{ background: colors.secondary }}
      />
    </span>
  );
}

function ScoreBox({
  value,
  onChange,
  readOnly,
}: {
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
}) {
  if (readOnly) {
    return (
      <div className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">
        {value}
      </div>
    );
  }
  return (
    <input
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      inputMode="numeric"
      maxLength={1}
      className="h-9 w-9 shrink-0 rounded border border-neutral-300 text-center text-sm"
    />
  );
}
