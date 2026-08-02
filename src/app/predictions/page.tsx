"use client";

import { useState } from "react";
import BottomNav from "@/components/BottomNav";
import TopBar from "@/components/TopBar";
import { TEAM_COLORS, currentRound, historyRounds, roundMatches } from "@/lib/mock-data";

type ScoreEntry = { home: string; away: string };

function emptyEntries(): Record<string, ScoreEntry> {
  return Object.fromEntries(
    roundMatches.map((m) => [m.id, { home: "", away: "" }])
  );
}

export default function PredictionsPage() {
  const [entries, setEntries] = useState<Record<string, ScoreEntry>>(emptyEntries);
  const [submitted, setSubmitted] = useState(false);
  const [selectedRound, setSelectedRound] = useState(currentRound.roundNumber);

  const allFilled = roundMatches.every(
    (m) => entries[m.id].home !== "" && entries[m.id].away !== ""
  );

  function setScore(matchId: string, side: "home" | "away", value: string) {
    if (value !== "" && !/^\d$/.test(value)) return;
    setEntries((prev) => ({ ...prev, [matchId]: { ...prev[matchId], [side]: value } }));
  }

  if (submitted && selectedRound === currentRound.roundNumber) {
    return (
      <main className="flex min-h-screen flex-col items-center gap-6 px-6 pb-24 pt-28">
        <TopBar />
        <h1 className="text-center text-lg font-medium">Check your history predictions</h1>

        <RoundPicker
          selectedRound={selectedRound}
          onChange={(n) => setSelectedRound(n)}
        />

        <div className="w-full max-w-md space-y-4">
          {roundMatches.map((m) => {
            const e = entries[m.id];
            return (
              <MatchRow
                key={m.id}
                homeTeam={m.homeTeam}
                awayTeam={m.awayTeam}
                home={e.home}
                away={e.away}
                readOnly
              />
            );
          })}
        </div>

        <button
          onClick={() => setSubmitted(false)}
          className="rounded-full bg-draw px-8 py-2 font-medium text-white hover:brightness-95"
        >
          Update prediction
        </button>

        <BottomNav />
      </main>
    );
  }

  if (selectedRound !== currentRound.roundNumber) {
    const past = historyRounds.find((r) => r.roundNumber === selectedRound);
    return (
      <main className="flex min-h-screen flex-col items-center gap-6 px-6 pb-24 pt-28">
        <TopBar />
        <h1 className="text-center text-lg font-medium">Check your history predictions</h1>

        <RoundPicker selectedRound={selectedRound} onChange={(n) => setSelectedRound(n)} />

        <div className="w-full max-w-md space-y-4">
          {past?.predictions.map((p, i) => (
            <MatchRow
              key={i}
              homeTeam={p.homeTeam}
              awayTeam={p.awayTeam}
              home={String(p.predHome)}
              away={String(p.predAway)}
              readOnly
            />
          ))}
        </div>

        <BottomNav />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-6 pb-24 pt-28">
      <TopBar />
      <h1 className="text-center text-lg font-medium">Set your round matches prediction</h1>

      <div className="w-full max-w-md space-y-4">
        {roundMatches.map((m) => {
          const e = entries[m.id];
          return (
            <MatchRow
              key={m.id}
              homeTeam={m.homeTeam}
              awayTeam={m.awayTeam}
              home={e.home}
              away={e.away}
              onChangeHome={(v) => setScore(m.id, "home", v)}
              onChangeAway={(v) => setScore(m.id, "away", v)}
            />
          );
        })}
      </div>

      <button
        disabled={!allFilled}
        onClick={() => setSubmitted(true)}
        className="rounded-full bg-brand px-8 py-2 font-medium text-white enabled:hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-neutral-300"
      >
        {allFilled ? "Send prediction" : "Fill predictions"}
      </button>

      <BottomNav />
    </main>
  );
}

function RoundPicker({
  selectedRound,
  onChange,
}: {
  selectedRound: number;
  onChange: (n: number) => void;
}) {
  const rounds = [currentRound.roundNumber, ...historyRounds.map((r) => r.roundNumber)];
  return (
    <select
      value={selectedRound}
      onChange={(e) => onChange(Number(e.target.value))}
      className="rounded-lg border border-neutral-300 px-4 py-2 text-sm"
    >
      {rounds.map((n) => (
        <option key={n} value={n}>
          Round {n}
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
