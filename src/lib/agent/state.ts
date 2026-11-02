// Agent state shapes and merge rules shared by the graph (server) and the studio (browser).
import type { Check } from "./checks";
import type { Critique, Draft, Fit, JobBrief, Settings } from "./schemas";

export const STEPS = {
  analyze: "Read the job post",
  match: "Match your experience",
  draft: "Write the first draft",
  review: "Critique & check",
  revise: "Revise",
} as const;
export type StepId = keyof typeof STEPS;

export interface Version extends Draft {
  version: number;
  source: "draft" | "auto" | "feedback";
  changes: string[];
  quality?: number;
}

export interface TraceEntry {
  step: StepId;
  model: string;
  ms: number;
}

export interface AgentSnapshot {
  job: string;
  profile: string;
  settings: Settings;
  feedback: string | null;
  brief: JobBrief | null;
  fit: Fit | null;
  fitScore: number | null;
  versions: Version[];
  critique: Critique | null;
  checks: Check[] | null;
  quality: number | null;
  autoRevisions: number;
  trace: TraceEntry[];
}

/** Upsert by version number: new drafts append, a review re-stamps the one it scored. */
export function upsertVersions(a: Version[], b: Version[]): Version[] {
  const out = [...a];
  for (const v of b) {
    const i = out.findIndex((x) => x.version === v.version);
    if (i >= 0) out[i] = v;
    else out.push(v);
  }
  return out.sort((x, y) => x.version - y.version);
}

export function emptySnapshot(input: Pick<AgentSnapshot, "job" | "profile" | "settings">): AgentSnapshot {
  return { ...input, feedback: null, brief: null, fit: null, fitScore: null, versions: [], critique: null, checks: null, quality: null, autoRevisions: 0, trace: [] };
}

/** Highest-scoring version; on a tie the newer one wins. A revision can occasionally score lower. */
export function bestVersion(versions: Version[]): Version | undefined {
  return versions.reduce<Version | undefined>((best, v) => (!best || (v.quality ?? -1) >= (best.quality ?? -1) ? v : best), undefined);
}

/** Applies one node's update the same way the graph's reducers do. */
export function applyUpdate(s: AgentSnapshot, u: Partial<AgentSnapshot>): AgentSnapshot {
  return {
    ...s,
    ...u,
    versions: u.versions ? upsertVersions(s.versions, u.versions) : s.versions,
    trace: u.trace ? [...s.trace, ...u.trace] : s.trace,
  };
}
