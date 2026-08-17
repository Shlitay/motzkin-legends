"use client";

import { createClient } from "@/lib/supabase/client";

export default function GoogleSignInButton({
  next,
  className,
  children,
}: {
  next: string;
  className?: string;
  children: React.ReactNode;
}) {
  async function signIn() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  }

  return (
    <button onClick={signIn} className={className}>
      {children}
    </button>
  );
}
