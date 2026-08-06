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

// Mirrors the `teams` table in schema.sql — kit colors shown next to each
// team name as two small circles.
export const TEAM_COLORS: Record<string, { primary: string; secondary: string }> = {
  "Beitar Jerusalem": { primary: "#c6c512", secondary: "#11222c" },
  "Bnei Sakhnin": { primary: "#c73332", secondary: "#fffeff" },
  "Hapoel Beer-Sheva": { primary: "#da2332", secondary: "#0f4772" },
  "Hapoel Haifa": { primary: "#ec434f", secondary: "#0c0c14" },
  "Hapoel Kiryat Shmona": { primary: "#2b2c7d", secondary: "#c5c5c5" },
  "Hapoel Jerusalem": { primary: "#ca2e32", secondary: "#1d1010" },
  "Hapoel Petach-Tikva": { primary: "#0566c4", secondary: "#0a0e28" },
  "Hapoel Ramat Gan": { primary: "#ae1527", secondary: "#d2c5c0" },
  "Hapoel Tel Aviv": { primary: "#d02038", secondary: "#cdc6df" },
  "Ironi Tiberias": { primary: "#07227c", secondary: "#04a3d4" },
  "Maccabi Haifa": { primary: "#03b985", secondary: "#f0f4f5" },
  "Maccabi Petach-Tikva": { primary: "#3f80c2", secondary: "#6e9cc4" },
  "Maccabi Netanya": { primary: "#facf17", secondary: "#000405" },
  "Maccabi Tel-Aviv": { primary: "#eadb0d", secondary: "#335573" },
};

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
