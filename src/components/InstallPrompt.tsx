"use client";

import { sendGAEvent } from "@next/third-parties/google";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/Logo";

// ---- Android/Chrome install offer ----------------------------------------
// Chrome fires `beforeinstallprompt` once, early in the page load. We keep
// it so the popup's button can open the browser's own "install app" dialog.
// iPhone Safari has no such event — there the popup shows the manual steps.

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();

// Mounted once in the root layout so the event is never missed.
export function InstallCatcher() {
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferred = e as InstallEvent;
      listeners.forEach((l) => l());
    };
    const onInstalled = () => {
      deferred = null;
      markDismissed();
      sendGAEvent("event", "pwa-installed");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return null;
}

// ---- when to offer it ------------------------------------------------------

const DISMISS_KEY = "pl-install-dismissed";

function markDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {}
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// Not when already running from the home screen, and never again after
// "לא להציג שוב".
export function shouldOfferInstall() {
  if (typeof window === "undefined" || isStandalone()) return false;
  try {
    return localStorage.getItem(DISMISS_KEY) !== "1";
  } catch {
    return true;
  }
}

type Platform = "prompt" | "ios" | "other";

function detectPlatform(): Platform {
  if (deferred) return "prompt";
  const ua = navigator.userAgent;
  const iOS = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  return iOS ? "ios" : "other";
}

function ShareGlyph() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="inline-block align-[-3px]">
      <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm leading-relaxed">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pitch-800 font-display text-xs font-semibold text-chalk">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}

// "Save the game to your home screen" popup, shown after a player's first
// save of predictions.
export default function InstallPrompt({ onClose }: { onClose: () => void }) {
  const [platform, setPlatform] = useState<Platform>(() => detectPlatform());

  useEffect(() => {
    const update = () => setPlatform(detectPlatform());
    listeners.add(update);
    sendGAEvent("event", "pwa-prompt-shown");
    return () => {
      listeners.delete(update);
    };
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    if (outcome === "accepted") markDismissed();
    onClose();
  }

  function never() {
    markDismissed();
    sendGAEvent("event", "pwa-prompt-never");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(11,42,23,.55)] sm:items-center" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-title"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-md flex-col gap-4 rounded-t-[26px] bg-chalk px-5 pb-5 pt-6 shadow-[0_-10px_30px_rgba(0,0,0,.25)] sm:rounded-[26px]"
      >
        <div className="flex items-center gap-3.5">
          <LogoMark size={56} className="shrink-0" />
          <div className="flex flex-col gap-0.5">
            <h2 id="install-title" className="text-xl font-black leading-tight">
              הניחושים נשמרו! שמרו את המשחק במסך הבית
            </h2>
            <p className="text-[13px] text-muted">ככה תיכנסו בלחיצה אחת, כמו לאפליקציה.</p>
          </div>
        </div>

        {platform === "prompt" ? (
          <button
            type="button"
            onClick={install}
            className="bg-gold flex h-[52px] items-center justify-center gap-2 rounded-[14px] text-base font-black text-gold-ink"
          >
            הוספה למסך הבית
          </button>
        ) : platform === "ios" ? (
          <ol className="flex flex-col gap-2.5 rounded-2xl border border-line bg-white p-3.5">
            <Step n={1}>
              לחצו על כפתור השיתוף <ShareGlyph /> בסרגל של Safari
            </Step>
            <Step n={2}>
              גללו ובחרו <b>״הוספה למסך הבית״</b>
            </Step>
            <Step n={3}>
              לחצו <b>״הוסף״</b> — וזהו
            </Step>
          </ol>
        ) : (
          <ol className="flex flex-col gap-2.5 rounded-2xl border border-line bg-white p-3.5">
            <Step n={1}>
              פתחו את תפריט הדפדפן <b>⋮</b>
            </Step>
            <Step n={2}>
              בחרו <b>״הוספה למסך הבית״</b> או <b>״התקנת אפליקציה״</b>
            </Step>
          </ol>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 flex-1 rounded-xl border-[1.5px] border-miss bg-white text-sm font-extrabold text-[#3F4440]"
          >
            אחר כך
          </button>
          <button type="button" onClick={never} className="min-h-11 flex-1 rounded-xl text-sm font-bold text-muted underline">
            לא להציג את ההודעה שוב
          </button>
        </div>
      </section>
    </div>
  );
}
