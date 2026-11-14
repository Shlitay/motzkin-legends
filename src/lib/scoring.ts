"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Defaults live in a plain module so server pages (/about) can read them;
// values exported from this "use client" file are not visible on the server.
import { DEFAULT_RULES, type ScoringRules } from "@/lib/scoringDefaults";

export { DEFAULT_RULES, type ScoringRules };

// exact = bull's-eye, dirDiff = right winner + same goal difference,
// drawDir = predicted a draw and it ended a draw (not exact), dir = right
// winner otherwise.
export type OutcomeKind = "exact" | "dirDiff" | "drawDir" | "dir" | "miss";

// Mirrors compute_prediction_points() in
// restructure-scoring-into-win-samediff-draw.sql — keep the two in sync.
export function outcomeKind(ph: number, pa: number, h: number, a: number): OutcomeKind {
  if (ph === h && pa === a) return "exact";
  if (h === a) return ph === pa ? "drawDir" : "miss";
  if (Math.sign(ph - pa) !== Math.sign(h - a)) return "miss";
  return ph - pa === h - a ? "dirDiff" : "dir";
}

export function pointsFor(kind: OutcomeKind, isDraw: boolean, r: ScoringRules): number {
  switch (kind) {
    case "exact":
      return isDraw ? r.drawHit : r.winHit;
    case "dirDiff":
      return r.winTowards + r.sameDiffBonus;
    case "drawDir":
      return r.drawTowards;
    case "dir":
      return r.winTowards;
    case "miss":
      return 0;
  }
}

export function computePoints(ph: number, pa: number, h: number, a: number, r: ScoringRules): number {
  return pointsFor(outcomeKind(ph, pa, h, a), h === a, r);
}

// Short chip labels ("בול", "כיוון + הפרש"…) used in path rows and the
// participants drawer.
export const CHIP_LABEL: Record<OutcomeKind, string> = {
  exact: "בול",
  dirDiff: "כיוון + הפרש",
  drawDir: "כיוון תיקו",
  dir: "בכיוון",
  miss: "פספוס",
};

export type EarnPath = { addHome: number; addAway: number; home: number; away: number; kind: OutcomeKind; points: number };

// "איך עוד אפשר להרוויח" (design/HANDOFF.md §3): final scores reachable by
// adding goals that would earn more than the player has right now. One row
// per points value (fewest extra goals, then fewer home goals), and a row is
// dropped when another one earns at least as much for no more goals.
export function earnPaths(ph: number, pa: number, h: number, a: number, r: ScoringRules): EarnPath[] {
  const p0 = computePoints(ph, pa, h, a, r);
  const best = new Map<number, EarnPath>();

  for (let x = 0; x <= 5; x++) {
    for (let y = 0; y <= 5; y++) {
      if (x === 0 && y === 0) continue;
      const fh = h + x;
      const fa = a + y;
      const kind = outcomeKind(ph, pa, fh, fa);
      const points = pointsFor(kind, fh === fa, r);
      if (points <= p0) continue;
      const cur = best.get(points);
      const goals = x + y;
      if (!cur || goals < cur.addHome + cur.addAway || (goals === cur.addHome + cur.addAway && x < cur.addHome)) {
        best.set(points, { addHome: x, addAway: y, home: fh, away: fa, kind, points });
      }
    }
  }

  const rows = [...best.values()];
  const kept = rows.filter(
    (p) => !rows.some((q) => q !== p && q.points > p.points && q.addHome + q.addAway <= p.addHome + p.addAway)
  );
  return kept
    .sort((p, q) => q.points - p.points || p.addHome + p.addAway - (q.addHome + q.addAway))
    .slice(0, 3);
}

// Latest scoring_rules row (manager-configurable), falling back to defaults.
export function useScoringRules(): ScoringRules {
  const [rules, setRules] = useState<ScoringRules>(DEFAULT_RULES);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data } = await supabase
        .from("scoring_rules")
        .select("win_hit_points, win_towards_points, same_diff_bonus_points, draw_hit_points, draw_towards_points")
        .order("effective_from", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setRules({
          winHit: data.win_hit_points,
          winTowards: data.win_towards_points,
          sameDiffBonus: data.same_diff_bonus_points,
          drawHit: data.draw_hit_points,
          drawTowards: data.draw_towards_points,
        });
      }
    })();
  }, []);

  return rules;
}
