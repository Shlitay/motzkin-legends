const ISRAEL_TZ = "Asia/Jerusalem";

// Match kickoffs are inherently Israel-local — always read a timestamp's
// wall-clock time in Israel time, regardless of the viewer's own device/
// browser timezone (someone checking from abroad should still see the
// actual Israel kickoff time, not their own local equivalent).
export function formatIsraelDeadline(iso: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ISRAEL_TZ,
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  // day/month come back zero-padded ("08"); strip that but keep hour/minute padded.
  const day = get("day").replace(/^0/, "");
  const month = get("month").replace(/^0/, "");
  return `${day}.${month} · ${get("hour")}:${get("minute")}`;
}

// dd/mm/yy hh:mm, Israel-local — shown on a not-started match's card so
// participants know exactly when kickoff is, in a denser format than
// formatIsraelDeadline's (no year, dot-separated) since this sits inside
// a small per-match box rather than a page-level deadline caption.
export function formatMatchKickoff(iso: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ISRAEL_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}`;
}
