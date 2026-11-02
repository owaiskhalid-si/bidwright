import { describe, expect, it } from "vitest";
import { applyUpdate, bestVersion, upsertVersions, type AgentSnapshot, type Version } from "./agent/state";
import { annotate } from "./annotate";
import { diffStats, diffWords } from "./diff";

const v = (version: number, quality?: number, proposal = ""): Version => ({ version, quality, proposal, source: "draft", changes: [], screeningAnswers: [], milestones: [] });

describe("annotate", () => {
  it("marks the required word, hard numbers and filler, and keeps every character", () => {
    const text = "Maple: no-shows fell from 11% to 4% in 3 months. I am confident this is a perfect fit.";
    const segs = annotate(text, ['Start your proposal with the word "Maple"']);
    expect(segs.map((s) => s.text).join("")).toBe(text);
    expect(segs.find((s) => s.kind === "required")?.text).toBe("Maple");
    expect(segs.filter((s) => s.kind === "number").map((s) => s.text)).toEqual(["11% to 4%", "3 months"]);
    expect(segs.filter((s) => s.kind === "flag").map((s) => s.text)).toEqual(["I am confident", "perfect fit"]);
  });
});

describe("diffWords", () => {
  it("finds added and removed words", () => {
    const parts = diffWords("We will build the booking page", "We will ship the booking page fast");
    expect(parts.filter((p) => p.op !== "same").map((p) => `${p.op}:${p.text.trim()}`)).toEqual(["del:build", "add:ship", "add:fast"]);
    expect(diffStats(parts)).toEqual({ added: 2, removed: 1 });
    expect(parts.filter((p) => p.op !== "del").map((p) => p.text).join("")).toBe("We will ship the booking page fast");
  });
});

describe("state merging", () => {
  it("upserts versions by number", () => {
    expect(upsertVersions([v(1), v(2)], [v(2, 80), v(3)]).map((x) => [x.version, x.quality])).toEqual([
      [1, undefined],
      [2, 80],
      [3, undefined],
    ]);
  });

  it("applies node updates like the graph reducers", () => {
    const s = { versions: [v(1)], trace: [{ step: "draft", model: "m", ms: 1 }], quality: null } as unknown as AgentSnapshot;
    const next = applyUpdate(s, { versions: [v(1, 70)], quality: 70, trace: [{ step: "review", model: "m", ms: 2 }] });
    expect(next.versions[0].quality).toBe(70);
    expect(next.trace).toHaveLength(2);
    expect(next.quality).toBe(70);
  });

  it("picks the best version, newest on a tie", () => {
    expect(bestVersion([v(1, 73), v(2, 70), v(3, 65)])?.version).toBe(1);
    expect(bestVersion([v(1, 80), v(2, 80)])?.version).toBe(2);
  });
});
