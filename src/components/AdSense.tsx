"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

// AdSense policy: no Google ads on screens without publisher content (sign-in,
// onboarding, admin). So the script loads only on the content pages below.
// The site is already verified, so it no longer has to be in every page's
// server HTML.
const AD_PATHS = new Set(["/about", "/rules", "/predictions", "/leaderboard"]);

export default function AdSense() {
  const pathname = usePathname();
  if (!AD_PATHS.has(pathname)) return null;
  return (
    <Script
      id="adsense"
      async
      strategy="afterInteractive"
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5971476129281770"
      crossOrigin="anonymous"
    />
  );
}
