"use client";

import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import StatCard from "@/components/StatCard";
import TopBar from "@/components/TopBar";
import { createClient } from "@/lib/supabase/client";
import { currentUser, lastRoundStats, seasonStats } from "@/lib/mock-data";

type ProfileRow = { full_name: string; avatar: string | null };
type OpenRound = { id: string; round_number: number };
type ParticipationStatus = "waiting" | "approved" | "rejected" | null;

export default function HomePage() {
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [openRound, setOpenRound] = useState<OpenRound | null>(null);
  const [status, setStatus] = useState<ParticipationStatus>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const [{ data: profileRow }, { data: roundRow }] = await Promise.all([
        supabase.from("users").select("full_name, avatar").eq("id", user.id).single(),
        supabase.from("rounds").select("id, round_number").eq("status", "open").single(),
      ]);

      setProfile(profileRow ?? null);
      setOpenRound(roundRow ?? null);

      if (roundRow) {
        const { data: participation } = await supabase
          .from("round_participation")
          .select("payment_status")
          .eq("user_id", user.id)
          .eq("round_id", roundRow.id)
          .maybeSingle();
        setStatus(participation?.payment_status ?? null);
      }

      setLoading(false);
    })();
  }, [supabase]);

  async function requestApproval() {
    if (!openRound) return;
    setRequesting(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("You've been signed out — please log in again.");
      setRequesting(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("round_participation")
      .insert({ user_id: user.id, round_id: openRound.id, payment_status: "waiting" });

    if (insertError) {
      setError(insertError.message);
      setRequesting(false);
      return;
    }

    setStatus("waiting");
    setRequesting(false);
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-10 px-6 pb-24 pt-28">
      <TopBar />
      <div className="flex flex-col items-center gap-2">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-3xl">
          {profile?.avatar ?? currentUser.avatar}
        </div>
        <p className="font-medium text-ink">{profile?.full_name ?? currentUser.fullName}</p>
      </div>

      {!loading && openRound && (
        <section className="w-full max-w-md rounded-2xl border border-neutral-200 bg-surface p-5 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Round {openRound.round_number} approval
          </p>
          {status === "approved" && (
            <p className="text-sm font-medium text-brand">
              You&apos;re approved to play this round.
            </p>
          )}
          {status === "waiting" && (
            <p className="text-sm text-muted">
              Approval requested — waiting on the manager to confirm your payment.
            </p>
          )}
          {status === "rejected" && (
            <p className="text-sm text-danger">
              Not approved for this round. Contact the manager if that&apos;s a mistake.
            </p>
          )}
          {status === null && (
            <>
              <p className="mb-3 text-sm text-muted">
                Send your payment via Paybox, then tap below to let the manager know.
              </p>
              <button
                disabled={requesting}
                onClick={requestApproval}
                className="rounded-full bg-brand px-6 py-2 text-sm font-medium text-white enabled:hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-neutral-300"
              >
                {requesting ? "Sending…" : "I've sent payment via Paybox"}
              </button>
            </>
          )}
          {error && <p className="mt-2 text-xs text-danger">{error}</p>}
        </section>
      )}

      <StatCard
        title="Last round"
        headline={`Place: ${lastRoundStats.place}`}
        towards={lastRoundStats.towards}
        points={lastRoundStats.points}
        hit={lastRoundStats.hit}
      />

      <StatCard
        title="All season"
        headline={`Total participation: ${seasonStats.totalParticipation}`}
        towards={seasonStats.towards}
        points={seasonStats.points}
        hit={seasonStats.hit}
      />

      <BottomNav />
    </main>
  );
}
