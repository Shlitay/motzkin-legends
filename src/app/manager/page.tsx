"use client";

import { useState } from "react";
import LeaderRow from "@/components/LeaderRow";
import TopBar from "@/components/TopBar";
import {
  approvedThisRound as initialApproved,
  mostPlayedUsers,
  mostWinningUsers,
  waitingForApproval as initialWaiting,
} from "@/lib/mock-data";

type Person = { name: string; avatar: string };

export default function ManagerDashboard() {
  const [waiting, setWaiting] = useState<Person[]>(initialWaiting);
  const [approved, setApproved] = useState<Person[]>(initialApproved);
  const [leaderTitle, setLeaderTitle] = useState<"played" | "winning">("played");
  const [confirmingReset, setConfirmingReset] = useState(false);

  function approve(person: Person) {
    setWaiting((w) => w.filter((p) => p.name !== person.name));
    setApproved((a) => [...a, person]);
  }

  function unapprove(person: Person) {
    setApproved((a) => a.filter((p) => p.name !== person.name));
    setWaiting((w) => [...w, person]);
  }

  function resetRound() {
    setWaiting([]);
    setApproved([]);
    setConfirmingReset(false);
  }

  const leaderRows = leaderTitle === "played" ? mostPlayedUsers : mostWinningUsers;

  return (
    <main className="flex min-h-screen flex-col items-center gap-8 px-6 pb-10 pt-28">
      <TopBar href="/manager" />
      <div>
        <span className="rounded bg-fuchsia-400 px-3 py-1 text-sm font-medium text-white">
          Manager dashboard
        </span>
      </div>

      <h1 className="text-lg font-semibold">Round participants</h1>

      <div className="grid w-full max-w-2xl grid-cols-1 gap-8 sm:grid-cols-2">
        <NameList title="Waiting for approval" people={waiting} onAction={approve} actionLabel="Approve →" />
        <NameList title="Approved this round" people={approved} onAction={unapprove} actionLabel="← Waiting" />
      </div>

      <section className="w-full max-w-md overflow-hidden rounded-[28px] bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_32px_-18px_rgba(0,0,0,0.28)]">
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            {leaderTitle === "played" ? "Most played users" : "Most winning users"}
          </h2>
          <button
            onClick={() => setLeaderTitle((t) => (t === "played" ? "winning" : "played"))}
            className="text-xs text-muted underline"
          >
            Swap ⇄
          </button>
        </div>
        <div className="divide-y divide-neutral-100">
          {leaderRows.map((r, i) => (
            <LeaderRow key={r.name} rank={i + 1} avatar={r.avatar} name={r.name} count={r.count} />
          ))}
        </div>
      </section>

      <button
        onClick={() => setConfirmingReset(true)}
        className="rounded-full border border-neutral-300 px-6 py-2 text-sm font-medium hover:bg-neutral-50"
      >
        Reset round
      </button>

      {confirmingReset && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-8 text-center shadow-lg">
            <p className="mb-6 text-xl font-semibold">
              Are you sure you want to reset the round?
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setConfirmingReset(false)}
                className="rounded-full bg-danger px-6 py-2 font-medium text-white hover:brightness-90"
              >
                Back
              </button>
              <button
                onClick={resetRound}
                className="rounded-full bg-brand px-6 py-2 font-medium text-white hover:bg-brand-dark"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function NameList({
  title,
  people,
  onAction,
  actionLabel,
}: {
  title: string;
  people: Person[];
  onAction?: (person: Person) => void;
  actionLabel?: string;
}) {
  return (
    <div>
      <h3 className="mb-2 text-center font-semibold">{title}</h3>
      <ol className="min-h-[10rem] space-y-1 rounded-xl border border-dashed border-neutral-300 p-4 text-sm">
        {people.length === 0 && <li className="text-muted">Empty</li>}
        {people.map((person, i) => (
          <li key={person.name + i} className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="text-muted">{i + 1}.</span>
              <span className="text-base">{person.avatar}</span>
              {person.name}
            </span>
            {onAction && (
              <button
                onClick={() => onAction(person)}
                className="text-xs text-brand underline"
              >
                {actionLabel}
              </button>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
