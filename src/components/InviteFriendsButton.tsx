"use client";

import { useEffect, useState } from "react";
import { CheckCircleIcon, ShareIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";

// "The name from Google" means full_name specifically (populated from the
// Google account on first login, see schema.sql's handle_new_user) — not
// nickname, which is a custom in-app override. utm_source/utm_medium (not
// a bespoke ?ref= param) so GA4 parses this natively into its own
// Acquisition reports (Session source/medium) with no extra event
// wiring — utm_medium is who shared it, utm_source is always "shareBtn"
// since this is the only share entry point today.
function inviteUtmParams(fullName: string) {
  const utm_medium = fullName.trim().toLowerCase().replace(/\s+/g, "_");
  return new URLSearchParams({ utm_source: "shareBtn", utm_medium });
}

// Message sent with the link (owner's wording, 2026-11-11). Most apps put
// it right above the link; the copy-link fallback includes it too.
const SHARE_TEXT = "בואו לנסות להיות הזוכים בליגת הניחושים!";

export default function InviteFriendsButton() {
  const [supabase] = useState(() => createClient());
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (!profile) return;
      setLink(`${window.location.origin}?${inviteUtmParams(profile.full_name)}`);
    })();
  }, [supabase]);

  async function share() {
    if (!link) return;

    if (navigator.share) {
      try {
        await navigator.share({ title: "Prediction Legends", text: SHARE_TEXT, url: link });
      } catch {
        // User closed the share sheet without picking anything — not an error.
      }
      return;
    }

    await navigator.clipboard.writeText(`${SHARE_TEXT}\n${link}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!link) return null;

  return (
    <button
      onClick={share}
      aria-label={copied ? "הקישור הועתק" : "שיתוף המשחק עם חבר"}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-pitch-line bg-pitch-900 text-chalk hover:bg-pitch-800"
    >
      {copied ? <CheckCircleIcon size={18} /> : <ShareIcon size={18} />}
    </button>
  );
}
