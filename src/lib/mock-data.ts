// Placeholder data standing in for Supabase until the real backend is wired up.
// Shapes here intentionally mirror schema.sql tables/columns.

export type Match = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  homeScore: number | null;
  awayScore: number | null;
};

export type Prediction = {
  matchId: string;
  predHome: number | null;
  predAway: number | null;
};

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

export const currentUser = {
  id: "u1",
  fullName: "Itay",
  avatar: "🦊",
  role: "participant" as const,
  // null until the participant completes onboarding.
  defaultHomeScore: null as number | null,
  defaultAwayScore: null as number | null,
};

// Real Round 1 fixtures, 22.8.2026, all kicking off 20:00.
export const currentRound = {
  id: "r1",
  roundNumber: 1,
  deadlineAt: "2026-08-22T20:00:00+03:00",
};

export const roundMatches: Match[] = [
  { id: "m1", homeTeam: "Maccabi Petach-Tikva", awayTeam: "Hapoel Kiryat Shmona", kickoffAt: "2026-08-22T20:00:00+03:00", homeScore: null, awayScore: null },
  { id: "m2", homeTeam: "Ironi Tiberias", awayTeam: "Hapoel Petach-Tikva", kickoffAt: "2026-08-22T20:00:00+03:00", homeScore: null, awayScore: null },
  { id: "m3", homeTeam: "Hapoel Jerusalem", awayTeam: "Maccabi Tel-Aviv", kickoffAt: "2026-08-22T20:00:00+03:00", homeScore: null, awayScore: null },
  { id: "m4", homeTeam: "Maccabi Haifa", awayTeam: "Hapoel Ramat Gan", kickoffAt: "2026-08-22T20:00:00+03:00", homeScore: null, awayScore: null },
  { id: "m5", homeTeam: "Hapoel Beer-Sheva", awayTeam: "Hapoel Haifa", kickoffAt: "2026-08-22T20:00:00+03:00", homeScore: null, awayScore: null },
  { id: "m6", homeTeam: "Maccabi Netanya", awayTeam: "Bnei Sakhnin", kickoffAt: "2026-08-22T20:00:00+03:00", homeScore: null, awayScore: null },
  { id: "m7", homeTeam: "Hapoel Tel Aviv", awayTeam: "Beitar Jerusalem", kickoffAt: "2026-08-22T20:00:00+03:00", homeScore: null, awayScore: null },
];

// Fresh DB, nobody's been scored yet — real app: these come from
// round_participation / season_stats and start at 0 for every participant
// until a round is scored, then update after each round (season figures
// accumulate round 1 + round 2 + ... ; last-round figures reset each round).
export const lastRoundStats = {
  place: 0,
  towards: 0,
  points: 0,
  hit: 0,
};

export const seasonStats = {
  totalParticipation: 0,
  towards: 0,
  points: 0,
  hit: 0,
};

// Empty — round 1 is the league's first round, so there's no history yet.
export const historyRounds: { roundNumber: number; predictions: { homeTeam: string; awayTeam: string; predHome: number; predAway: number }[] }[] = [];

export const waitingForApproval = [
  { name: "Niv", avatar: "🐢" },
  { name: "Ofir", avatar: "🦝" },
  { name: "Itay", avatar: "🦊" },
  { name: "Avi", avatar: "🐝" },
  { name: "Yossi", avatar: "🐺" },
];

export const approvedThisRound = [
  { name: "Natan", avatar: "🦁" },
  { name: "Omri", avatar: "🐼" },
  { name: "Saar", avatar: "🐯" },
  { name: "Elad", avatar: "🐸" },
  { name: "Gal", avatar: "🐙" },
  { name: "Aviv", avatar: "🦄" },
  { name: "Itay", avatar: "🦊" },
  { name: "Omer", avatar: "🐨" },
  { name: "Tomer", avatar: "🐵" },
  { name: "Lior", avatar: "🦉" },
  { name: "Mor", avatar: "🐰" },
];

// The whole friend group. Fresh DB, round 1 hasn't been played or scored
// yet, so every leaderboard below lists everyone tied at 0 — real app:
// these come from round_participation (current round) and season_stats
// (season totals), populated once results start getting entered.
export const PARTICIPANTS = [
  { name: "Itay", avatar: "🦊" },
  { name: "Eran", avatar: "🐻" },
  { name: "Yoav", avatar: "🦖" },
  { name: "Saar", avatar: "🐯" },
  { name: "Gil", avatar: "🐧" },
  { name: "Natan", avatar: "🦁" },
  { name: "Omri", avatar: "🐼" },
  { name: "Elad", avatar: "🐸" },
  { name: "Gal", avatar: "🐙" },
  { name: "Aviv", avatar: "🦄" },
  { name: "Omer", avatar: "🐨" },
  { name: "Tomer", avatar: "🐵" },
  { name: "Lior", avatar: "🦉" },
  { name: "Mor", avatar: "🐰" },
];

// Table 1 on the league board: standings for the in-progress round.
export const currentRoundPoints = PARTICIPANTS.map((p) => ({ ...p, count: 0 }));

// Table 2 on the league board: most points across the whole season so far.
export const seasonPoints = PARTICIPANTS.map((p) => ({ ...p, count: 0 }));

// Table 3 on the league board (and the manager dashboard's own preview):
// most rounds played.
export const mostPlayedUsers = PARTICIPANTS.map((p) => ({ ...p, count: 0 }));

// Manager dashboard's other leaderboard toggle: most rounds won.
export const mostWinningUsers = PARTICIPANTS.map((p) => ({ ...p, count: 0 }));
