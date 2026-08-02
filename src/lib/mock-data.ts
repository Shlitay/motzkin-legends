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

export const currentRound = {
  id: "r5",
  roundNumber: 5,
  deadlineAt: "2026-08-09T15:00:00+03:00",
};

export const roundMatches: Match[] = [
  { id: "m1", homeTeam: "Maccabi Tel-Aviv", awayTeam: "Hapoel Beer-Sheva", kickoffAt: "2026-08-09T15:00:00+03:00", homeScore: null, awayScore: null },
  { id: "m2", homeTeam: "Beitar Jerusalem", awayTeam: "Maccabi Haifa", kickoffAt: "2026-08-09T17:15:00+03:00", homeScore: null, awayScore: null },
  { id: "m3", homeTeam: "Hapoel Tel Aviv", awayTeam: "Bnei Sakhnin", kickoffAt: "2026-08-09T19:30:00+03:00", homeScore: null, awayScore: null },
  { id: "m4", homeTeam: "Maccabi Petach-Tikva", awayTeam: "Hapoel Haifa", kickoffAt: "2026-08-10T15:00:00+03:00", homeScore: null, awayScore: null },
  { id: "m5", homeTeam: "Maccabi Netanya", awayTeam: "Hapoel Kiryat Shmona", kickoffAt: "2026-08-10T17:15:00+03:00", homeScore: null, awayScore: null },
  { id: "m6", homeTeam: "Hapoel Jerusalem", awayTeam: "Ironi Tiberias", kickoffAt: "2026-08-10T19:30:00+03:00", homeScore: null, awayScore: null },
  { id: "m7", homeTeam: "Hapoel Petach-Tikva", awayTeam: "Hapoel Ramat Gan", kickoffAt: "2026-08-10T19:30:00+03:00", homeScore: null, awayScore: null },
];

export const lastRoundStats = {
  place: 3,
  towards: 4,
  points: 35,
  hit: 2,
};

export const seasonStats = {
  totalParticipation: 8,
  towards: 21,
  points: 210,
  hit: 9,
};

export const historyRounds = [
  {
    roundNumber: 4,
    predictions: [
      { homeTeam: "Maccabi Tel-Aviv", awayTeam: "Hapoel Beer-Sheva", predHome: 1, predAway: 3 },
      { homeTeam: "Beitar Jerusalem", awayTeam: "Maccabi Haifa", predHome: 2, predAway: 3 },
      { homeTeam: "Hapoel Tel Aviv", awayTeam: "Bnei Sakhnin", predHome: 1, predAway: 1 },
      { homeTeam: "Maccabi Petach-Tikva", awayTeam: "Hapoel Haifa", predHome: 2, predAway: 3 },
      { homeTeam: "Maccabi Netanya", awayTeam: "Hapoel Kiryat Shmona", predHome: 1, predAway: 3 },
    ],
  },
  {
    roundNumber: 3,
    predictions: [
      { homeTeam: "Hapoel Jerusalem", awayTeam: "Ironi Tiberias", predHome: 2, predAway: 1 },
      { homeTeam: "Hapoel Petach-Tikva", awayTeam: "Hapoel Ramat Gan", predHome: 0, predAway: 0 },
    ],
  },
];

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

export const mostPlayedUsers = [
  { name: "Eran", avatar: "🐻", count: 8 },
  { name: "Yoav", avatar: "🦖", count: 8 },
  { name: "Itay", avatar: "🦊", count: 7 },
  { name: "Saar", avatar: "🐯", count: 6 },
  { name: "Gil", avatar: "🐧", count: 6 },
];

export const mostWinningUsers = [
  { name: "Eran", avatar: "🐻", count: 3 },
  { name: "Yoav", avatar: "🦖", count: 2 },
  { name: "Itay", avatar: "🦊", count: 2 },
  { name: "Saar", avatar: "🐯", count: 1 },
  { name: "Gil", avatar: "🐧", count: 1 },
];
