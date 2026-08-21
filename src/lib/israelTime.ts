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
