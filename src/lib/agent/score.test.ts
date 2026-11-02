import { describe, expect, it } from "vitest";
import type { Check } from "./checks";
import type { Critique, Fit } from "./schemas";
import { fitLabel, fitScore, qualityScore, rubricTotal } from "./score";

const fit = (matches: Array<"strong" | "partial" | "missing">): Fit => ({
  requirements: matches.map((match, i) => ({ requirement: `r${i}`, match, evidence: "" })),
  proofPoints: [],
  gaps: [],
  angle: "",
});

const critique = (scores: number[]): Critique => ({
  scores: (["hook", "specificity", "proof", "plan", "close", "honesty"] as const).map((id, i) => ({ id, score: scores[i] ?? 1, note: "" })),
  edits: [],
  verdict: "",
});

const check = (pass: boolean, hard = false): Check => ({ id: String(Math.random()), label: "", detail: "", pass, hard });

describe("fitScore", () => {
  it("weights strong 1, partial 0.5, missing 0", () => {
    expect(fitScore(fit(["strong", "strong", "partial", "missing"]))).toBe(63);
    expect(fitScore(fit([]))).toBe(0);
  });
  it("labels the score", () => {
    expect(fitLabel(80).tone).toBe("good");
    expect(fitLabel(60).tone).toBe("ok");
    expect(fitLabel(20).tone).toBe("weak");
  });
});

describe("qualityScore", () => {
  it("is 80% rubric and 20% checks", () => {
    expect(qualityScore(critique([5, 5, 5, 5, 5, 5]), [check(true), check(true)])).toBe(100);
    expect(qualityScore(critique([4, 4, 4, 4, 4, 4]), [check(true), check(false)])).toBe(74);
  });
  it("caps at 59 when a hard check fails or honesty is low", () => {
    expect(qualityScore(critique([5, 5, 5, 5, 5, 5]), [check(false, true)])).toBe(59);
    expect(qualityScore(critique([5, 5, 5, 5, 5, 2]), [check(true)])).toBe(59);
  });
  it("counts a criterion the model skipped as the lowest score", () => {
    expect(rubricTotal({ scores: [{ id: "hook", score: 5, note: "" }], edits: [], verdict: "" })).toBe(10);
  });
});
