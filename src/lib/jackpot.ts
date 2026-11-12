import { ENTRY_FEE_ILS } from "@/components/JackpotBadge";

// Above this the pot is "big" and 3rd place gets a prize too. A pot of
// exactly the threshold counts as "up to" (owner decision, 2026-11-11).
// Raised from ₪300 to ₪360 with the ₪30 fee (2026-11-12): 12 players = ₪360
// is still "up to", 13+ is "over".
export const BIG_POT_THRESHOLD = 360;

export type JackpotSplit = { pot: number; first: number; second: number; third: number; big: boolean };

// design/HANDOFF.md §6: up to the threshold → 2nd gets one free round (one entry fee
// back), the rest to 1st. Over it → 2nd gets two free rounds, 3rd one,
// the rest to 1st. Places that don't exist (too few players) get nothing.
export function jackpotSplit(participants: number): JackpotSplit {
  const pot = participants * ENTRY_FEE_ILS;
  const big = pot > BIG_POT_THRESHOLD;
  const second = participants >= 2 ? (big ? 2 : 1) * ENTRY_FEE_ILS : 0;
  const third = participants >= 3 && big ? ENTRY_FEE_ILS : 0;
  return { pot, first: pot - second - third, second, third, big };
}
