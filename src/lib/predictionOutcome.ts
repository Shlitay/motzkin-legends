export type Outcome = "exact" | "direction" | "miss";

// Mirrors the exact/direction/miss comparison in submit_match_result() and
// lock_expired_rounds() (see fix-round1-kickoff-times.sql's sibling
// migrations) — derived from the raw scores rather than from the points
// value itself, since scoring_rules' point amounts are manager-configurable
// and shouldn't be hardcoded into which color tier a card gets.
export function deriveOutcome(
  predHome: number,
  predAway: number,
  actualHome: number,
  actualAway: number
): Outcome {
  if (predHome === actualHome && predAway === actualAway) return "exact";
  if (Math.sign(predHome - predAway) === Math.sign(actualHome - actualAway)) return "direction";
  return "miss";
}
