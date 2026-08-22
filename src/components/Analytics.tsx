"use client";

import { GoogleAnalytics } from "@next/third-parties/google";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const GA_MEASUREMENT_ID = "G-GX7JT1JLL4";

// Excludes the manager's own account from tracking — GA4's IP-based
// "internal traffic" filters are unreliable across devices/networks, but
// we already know exactly who the manager is (role = 'manager'), so this
// checks that directly instead. Anonymous visitors (not logged in yet,
// e.g. on the login page) are still tracked — only a *known* manager
// session is excluded. Starts untracked (null) until the check resolves,
// so there's no brief window where the manager gets a tracked pageview
// before we find out who they are.
export default function Analytics() {
  const [shouldTrack, setShouldTrack] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setShouldTrack(true);
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      setShouldTrack(profile?.role !== "manager");
    })();
  }, []);

  if (!shouldTrack) return null;
  return <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />;
}
