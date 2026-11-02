// Reads real recorded runs and the eval report for the static marketing pages.
import report from "@/data/eval-report.json";
import type { AgentSnapshot } from "./agent/state";
import { RECORDINGS } from "./recordings";

export type EvalReport = typeof report;
export const evalReport: EvalReport = report;

export function finalSnapshot(sampleId: string): AgentSnapshot | null {
  const rec = RECORDINGS[sampleId];
  const last = rec?.lines.findLast((l) => l.line.type === "final")?.line;
  return last && last.type === "final" ? last.state : null;
}
