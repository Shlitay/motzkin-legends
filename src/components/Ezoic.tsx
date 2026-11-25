"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Ezoic (incubator program, added 2026-11-25). The scripts themselves are in
// app/layout.tsx's <head>, as Ezoic's docs require. This component only tells
// Ezoic about client-side page changes: Next.js swaps pages without a reload,
// so per https://docs.ezoic.com/docs/ezoicads/platforms/nextjs/ the old
// placeholders are destroyed and showAds() is called again for the new page.
//
// Same rule as AdSense.tsx: ads only on screens with real content, never on
// sign-in, onboarding or the manager area.
const AD_PATHS = new Set(["/about", "/rules", "/predictions", "/leaderboard"]);

type EzStandalone = {
  cmd: Array<() => void>;
  showAds?: (...ids: number[]) => void;
  destroyPlaceholders?: (...ids: number[]) => void;
};

declare global {
  interface Window {
    ezstandalone?: EzStandalone;
  }
}

function runEzoic(fn: () => void) {
  window.ezstandalone = window.ezstandalone || { cmd: [] };
  window.ezstandalone.cmd = window.ezstandalone.cmd || [];
  window.ezstandalone.cmd.push(fn);
}

export default function EzoicRouteAds() {
  const pathname = usePathname();

  useEffect(() => {
    runEzoic(() => {
      window.ezstandalone?.destroyPlaceholders?.();
      if (!AD_PATHS.has(pathname)) return;
      requestAnimationFrame(() => {
        window.ezstandalone?.showAds?.();
      });
    });
  }, [pathname]);

  return null;
}
