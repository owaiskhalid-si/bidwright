// Scores are computed in code from what the model extracted, so they are explainable
// and stable: the same requirement matrix always gives the same fit score.
import type { Check } from "./checks";
import { RUBRIC, type Critique, type Fit } from "./schemas";

const MATCH_POINTS = { strong: 1, partial: 0.5, missing: 0 } as const;

export function fitScore(fit: Fit): number {
  if (fit.requirements.length === 0) return 0;
  const points = fit.requirements.reduce((sum, r) => sum + MATCH_POINTS[r.match], 0);
  return Math.round((points / fit.requirements.length) * 100);
}

export function fitLabel(score: number): { label: string; tone: "good" | "ok" | "weak" } {
  if (score >= 75) return { label: "Strong fit", tone: "good" };
  if (score >= 50) return { label: "Worth a bid", tone: "ok" };
  return { label: "Long shot", tone: "weak" };
}

export const RUBRIC_MAX = RUBRIC.length * 5;

/** Rubric total; a criterion the model skipped counts as 1, the lowest score. */
export function rubricTotal(c: Critique): number {
  return RUBRIC.reduce((sum, r) => sum + (c.scores.find((s) => s.id === r.id)?.score ?? 1), 0);
}

/**
 * Quality out of 100: the rubric carries 80 points; deterministic checks carry 20.
 * A failed hard check (missed screening word, unanswered question) caps the score at 59,
 * and so does an honesty score below 3: an overclaiming proposal is not ready to send.
 */
export function qualityScore(c: Critique, checks: Check[]): number {
  const rubric = (rubricTotal(c) / RUBRIC_MAX) * 80;
  const passRate = checks.length ? checks.filter((x) => x.pass).length / checks.length : 1;
  const score = Math.round(rubric + passRate * 20);
  const honesty = c.scores.find((s) => s.id === "honesty")?.score ?? 1;
  return checks.some((x) => x.hard && !x.pass) || honesty < 3 ? Math.min(score, 59) : score;
}

/** The agent revises on its own until a draft reaches this, at most MAX_AUTO_REVISIONS times. */
export const QUALITY_BAR = 84;
export const MAX_AUTO_REVISIONS = 2;
/** Below this honesty score a draft is revised even when its overall quality clears the bar. */
export const HONESTY_BAR = 4;

export const honestyOf = (c: Critique | null) => c?.scores.find((s) => s.id === "honesty")?.score ?? 0;

export const needsRevision = (c: Critique | null, quality: number | null) => (quality ?? 0) < QUALITY_BAR || honestyOf(c) < HONESTY_BAR;
