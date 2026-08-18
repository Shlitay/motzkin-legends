import { createClient } from "@/lib/supabase/client";

// Lazily locks any round whose deadline has passed and fills in default
// scores for matches approved participants didn't predict. Safe to call on
// every relevant page load — the underlying SQL function is a no-op for
// rounds still before their deadline. Never blocks or throws: this is a
// best-effort nudge, not a source of truth the UI depends on synchronously.
export async function lockExpiredRounds(supabase: ReturnType<typeof createClient>) {
  const { error } = await supabase.rpc("lock_expired_rounds");
  if (error) {
    console.error("lockExpiredRounds failed:", error.message);
  }
}
