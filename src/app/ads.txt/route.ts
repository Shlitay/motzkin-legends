// /ads.txt = Ezoic's managed list + our own AdSense line (added 2026-11-25).
// Ezoic keeps its list at adstxtmanager.com and updates it as it adds ad
// partners, so it's fetched (cached for a day) rather than copied. If that
// fetch fails, the AdSense line is still served on its own.
const EZOIC_ADS_TXT = "https://srv.adstxtmanager.com/19390/prediction-legends.com";
const ADSENSE_LINE = "google.com, pub-5971476129281770, DIRECT, f08c47fec0942fa0";

export const revalidate = 86400;

export async function GET() {
  let ezoic = "";
  try {
    const res = await fetch(EZOIC_ADS_TXT, { next: { revalidate } });
    if (res.ok) ezoic = (await res.text()).trim();
  } catch {
    // keep the AdSense line below
  }

  const body = [ezoic, "# AdSense (own account)", ADSENSE_LINE].filter(Boolean).join("\n") + "\n";
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
