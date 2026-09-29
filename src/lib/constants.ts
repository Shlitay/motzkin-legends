// Renamed from mock-data.ts (2026-09-16) — this file hasn't held mock data
// in a long time; every export here is real, live reference data used
// throughout the app.

// Mirrors the `teams` table in schema.sql — club crest shown next to each
// team name. Keys are Hebrew (see add-hebrew-team-names.sql) since that's
// what matches.home_team/away_team hold once that migration runs — must
// stay in sync with it. Files self-hosted in public/team-logos/ (fetched
// from football-logos.cc, 256x256 PNGs) rather than hotlinked, so the app
// doesn't depend on that site's CDN staying up.
export const TEAM_LOGOS: Record<string, string> = {
  'בית"ר ירושלים': "/team-logos/beitar-jerusalem.png",
  "בני סכנין": "/team-logos/bnei-sakhnin.png",
  "הפועל באר שבע": "/team-logos/hapoel-beer-sheva.png",
  "הפועל חיפה": "/team-logos/hapoel-haifa.png",
  "הפועל קריית שמונה": "/team-logos/hapoel-kiryat-shmona.png",
  "הפועל ירושלים": "/team-logos/hapoel-jerusalem.png",
  "הפועל פתח תקווה": "/team-logos/hapoel-petah-tikva.png",
  "הפועל רמת גן": "/team-logos/hapoel-ramat-gan.png",
  "הפועל תל אביב": "/team-logos/hapoel-tel-aviv.png",
  "עירוני טבריה": "/team-logos/ironi-tiberias.png",
  "מכבי חיפה": "/team-logos/maccabi-haifa.png",
  "מכבי פתח תקווה": "/team-logos/maccabi-petah-tikva.png",
  "מכבי נתניה": "/team-logos/maccabi-netanya.png",
  "מכבי תל אביב": "/team-logos/maccabi-tel-aviv.png",

  // European clubs, added 2026-09-16 for round 5 onward (10 matches/round).
  "ארסנל": "/team-logos/arsenal.png",
  "ברייטון": "/team-logos/brighton.png",
  "דורטמונד": "/team-logos/borussia-dortmund.png",
  "שטוטגרט": "/team-logos/vfb-stuttgart.png",
  "אינטר מילאן": "/team-logos/inter-milan.png",
  "רומא": "/team-logos/roma.png",
  "ברצלונה": "/team-logos/barcelona.png",
  "סביליה": "/team-logos/sevilla.png",

  // Champions League clubs, added 2026-09-29 for round 6 (all-CL round).
  // Slovan Bratislava has no crest yet — no URL was supplied for it, so
  // it just renders without one on /predictions until one is added.
  "סבאח": "/team-logos/sabah.png",
  "סלאביה פראג": "/team-logos/slavia-praha.png",
  "לאנס": "/team-logos/rc-lens.png",
  "ספורטינג": "/team-logos/sporting-cp.png",
  "ויאריאל": "/team-logos/villarreal.png",
  "נאפולי": "/team-logos/napoli.png",
  "ויקינג": "/team-logos/viking.png",
  "באיירן מינכן": "/team-logos/bayern-munchen.png",
  "אתלטיקו מדריד": "/team-logos/atletico-madrid.png",
  "מנצ׳סטר יונייטד": "/team-logos/manchester-united.png",
  "קלאב בריז׳": "/team-logos/club-brugge.png",
  "לייפציג": "/team-logos/rb-leipzig.png",
  "PSV איינדהובן": "/team-logos/psv.png",
  "גלטסראיי": "/team-logos/galatasaray.png",
  "ליל": "/team-logos/lille.png",
  "לאסק לינץ": "/team-logos/lask.png",
  "ליברפול": "/team-logos/liverpool.png",
  "פיינורד": "/team-logos/feyenoord.png",
  "קומו": "/team-logos/como-1907.png",
  "בודו/גלימט": "/team-logos/bodo-glimt.png",
  "שחטאר דונייצק": "/team-logos/shakhtar.png",
  "איאק אתונה": "/team-logos/aek-athens.png",
  "פריז סן ז׳רמן": "/team-logos/paris-saint-germain.png",
  "מנצ׳סטר סיטי": "/team-logos/manchester-city.png",
  "ריאל מדריד": "/team-logos/real-madrid.png",
  "פורטו": "/team-logos/fc-porto.png",
  "בטיס": "/team-logos/real-betis.png",
  "פנרבחצ׳ה": "/team-logos/fenerbahce.png",
  "אסטון וילה": "/team-logos/aston-villa.png",
};

// Shortened display forms for full team names that wrap to two lines in
// the small match-row boxes on /predictions. Only for display — matches
// still key off the full name from home_team/away_team everywhere else
// (TEAM_LOGOS lookup, comparisons, etc).
export const TEAM_SHORT_NAMES: Record<string, string> = {
  "הפועל באר שבע": 'הפועל ב"ש',
  "הפועל תל אביב": 'הפועל ת"א',
  "הפועל קריית שמונה": 'הפועל ק"ש',
  "מכבי פתח תקווה": 'מכבי פ"ת',
  "הפועל פתח תקווה": 'הפועל פ"ת',
};

export function shortTeamName(team: string): string {
  return TEAM_SHORT_NAMES[team] ?? team;
}

// Free, self-hosted "library": a curated set of fun emoji, picked once at
// onboarding and shown next to the participant's name everywhere.
export const AVATAR_LIBRARY = [
  "🦊", "🐻", "🐼", "🐨", "🦁", "🐯", "🐸", "🐵", "🐙", "🦄",
  "🦖", "🐢", "🦉", "🐺", "🦔", "🐰", "🐹", "🦝", "🐬", "🦈",
  "🐲", "🤖", "👽", "👻", "🥷", "🎃", "🐝", "🦋", "🦥", "🐧",
];
