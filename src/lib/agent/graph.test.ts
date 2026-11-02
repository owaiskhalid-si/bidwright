// Runs the real LangGraph graph end to end on the deterministic mock model (BIDWRIGHT_MOCK=1).
import { END } from "@langchain/langgraph";
import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE, SAMPLE_JOBS } from "../samples";
import { afterReview, entry } from "./graph";
import { RequestSchema, runAgent, type AgentRequest, type StreamLine } from "./run";
import type { AgentSnapshot, Version } from "./state";

const base: AgentRequest = { job: SAMPLE_JOBS[0].text, profile: DEFAULT_PROFILE, settings: { tone: "direct", length: "standard" } };

async function collect(req: AgentRequest) {
  const lines: StreamLine[] = [];
  for await (const line of runAgent(req)) lines.push(line);
  const final = lines.at(-1);
  if (final?.type !== "final") throw new Error("run did not finish");
  return { lines, state: final.state };
}

const v = (version: number, quality?: number): Version => ({ version, quality, source: "draft", changes: [], proposal: "", screeningAnswers: [], milestones: [] });

describe("proposal graph", () => {
  it("drafts, critiques, revises a weak draft and stops for review", async () => {
    const { lines, state } = await collect(base);
    const order = lines.filter((l) => l.type === "step" && l.status === "done").map((l) => (l as { step: string }).step);
    expect(order).toEqual(["analyze", "match", "draft", "review", "revise", "review"]);
    // Every node announces itself before it reports.
    expect(lines.filter((l) => l.type === "step" && l.status === "start")).toHaveLength(order.length);

    expect(state.versions.map((x) => x.source)).toEqual(["draft", "auto"]);
    expect(state.versions[0].quality).toBeLessThan(state.versions[1].quality!);
    expect(state.versions[1].proposal.startsWith("Maple")).toBe(true);
    expect(state.checks?.find((c) => c.id === "opener:Maple")?.pass).toBe(true);
    expect(state.autoRevisions).toBe(1);
    expect(state.trace.map((t) => t.step)).toEqual(order);
  });

  it("re-enters at revise with the freelancer's feedback and does not loop afterwards", async () => {
    const first = await collect(base);
    const s = first.state;
    const resumed = await collect({
      ...base,
      resume: { feedback: "Mention PHIPA", brief: s.brief!, fit: s.fit!, fitScore: s.fitScore!, versions: s.versions, critique: s.critique, checks: s.checks, quality: s.quality, autoRevisions: s.autoRevisions },
    });
    const order = resumed.lines.filter((l) => l.type === "step" && l.status === "done").map((l) => (l as { step: string }).step);
    expect(order).toEqual(["revise", "review"]);
    expect(resumed.state.versions.map((x) => x.version)).toEqual([1, 2, 3]);
    expect(resumed.state.versions.at(-1)!.source).toBe("feedback");
  });

  it("validates requests before running", () => {
    expect(RequestSchema.safeParse({ ...base, job: "too short" }).success).toBe(false);
    expect(RequestSchema.safeParse({ ...base, settings: { tone: "angry", length: "short" } }).success).toBe(false);
    expect(RequestSchema.safeParse(base).success).toBe(true);
  });
});

describe("routing", () => {
  const honest = (score: number) => ({ scores: [{ id: "honesty" as const, score, note: "" }], edits: [], verdict: "" });
  const snap = (over: Partial<AgentSnapshot>) => ({ feedback: null, quality: 50, autoRevisions: 0, versions: [v(1, 50)], critique: honest(5), ...over });

  it("revises below the bar, up to the limit", () => {
    expect(afterReview(snap({}))).toBe("revise");
    expect(afterReview(snap({ quality: 90 }))).toBe(END);
    expect(afterReview(snap({ autoRevisions: 2 }))).toBe(END);
  });

  it("revises an overclaiming draft even when its score clears the bar", () => {
    expect(afterReview(snap({ quality: 90, critique: honest(3) }))).toBe("revise");
  });

  it("stops when a revision did not improve", () => {
    expect(afterReview(snap({ quality: 60, autoRevisions: 1, versions: [v(1, 70), v(2, 60)] }))).toBe(END);
    expect(afterReview(snap({ quality: 75, autoRevisions: 1, versions: [v(1, 60), v(2, 75)] }))).toBe("revise");
  });

  it("never auto-revises after human feedback", () => {
    expect(afterReview(snap({ feedback: "shorter", quality: 10 }))).toBe(END);
  });

  it("starts at revise only when there is something to revise", () => {
    expect(entry({ feedback: "x", brief: null, fit: null, versions: [] })).toBe("analyze");
    expect(entry({ feedback: null, brief: {} as never, fit: {} as never, versions: [v(1)] })).toBe("analyze");
    expect(entry({ feedback: "x", brief: {} as never, fit: {} as never, versions: [v(1)] })).toBe("revise");
  });
});
