// Validates what the browser sends and streams the graph's progress back as NDJSON lines.
import * as z from "zod";
import { buildGraph } from "./graph";
import { CritiqueSchema, DraftSchema, FitSchema, JobBriefSchema, LIMITS, RunInputSchema } from "./schemas";
import type { AgentSnapshot, StepId } from "./state";

const VersionSchema = DraftSchema.extend({
  version: z.number().int().min(1).max(50),
  source: z.enum(["draft", "auto", "feedback"]),
  changes: z.array(z.string().max(400)).max(8),
  quality: z.number().min(0).max(100).optional(),
});

/** A finished run sent back with the freelancer's feedback; re-enters the graph at `revise`. */
export const ResumeSchema = z.object({
  feedback: z.string().trim().min(3, "Say what to change.").max(LIMITS.feedback),
  brief: JobBriefSchema,
  fit: FitSchema,
  fitScore: z.number().min(0).max(100),
  versions: z.array(VersionSchema).min(1).max(12),
  critique: CritiqueSchema.nullable(),
  checks: z.array(z.object({ id: z.string(), label: z.string(), pass: z.boolean(), detail: z.string(), hard: z.boolean() })).max(40).nullable(),
  quality: z.number().min(0).max(100).nullable(),
  autoRevisions: z.number().int().min(0).max(10),
});
export type Resume = z.infer<typeof ResumeSchema>;

export const RequestSchema = RunInputSchema.extend({ resume: ResumeSchema.optional() });
export type AgentRequest = z.infer<typeof RequestSchema>;

export type StreamLine =
  | { type: "step"; step: StepId; status: "start" }
  | { type: "step"; step: StepId; status: "done"; update: Partial<AgentSnapshot> }
  | { type: "final"; state: AgentSnapshot; ms: number }
  | { type: "error"; message: string };

const graph = buildGraph();

export async function* runAgent(req: AgentRequest, signal?: AbortSignal): AsyncGenerator<StreamLine> {
  const started = Date.now();
  const input: Partial<AgentSnapshot> = { job: req.job, profile: req.profile, settings: req.settings, ...(req.resume ?? {}) };
  let state = input as AgentSnapshot;
  const stream = await graph.stream(input, { streamMode: ["updates", "custom", "values"], signal, recursionLimit: 20 });
  for await (const [mode, chunk] of stream as AsyncIterable<[string, unknown]>) {
    if (mode === "custom") yield chunk as StreamLine;
    else if (mode === "values") state = chunk as AgentSnapshot;
    else if (mode === "updates") {
      for (const [step, update] of Object.entries(chunk as Record<string, Partial<AgentSnapshot>>)) {
        yield { type: "step", step: step as StepId, status: "done", update };
      }
    }
  }
  yield { type: "final", state, ms: Date.now() - started };
}
