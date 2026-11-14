export type ScoringRules = {
  winHit: number;
  winTowards: number;
  sameDiffBonus: number;
  drawHit: number;
  drawTowards: number;
};

// Same defaults as the scoring_rules columns; used until the live row loads.
export const DEFAULT_RULES: ScoringRules = {
  winHit: 10,
  winTowards: 5,
  sameDiffBonus: 1,
  drawHit: 10,
  drawTowards: 6,
};
