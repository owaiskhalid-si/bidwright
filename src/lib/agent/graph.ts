// The proposal agent as a LangGraph state machine:
//
//   START ─┬─▶ analyze ─▶ match ─▶ draft ─▶ review ─┬─▶ END (awaiting the freelancer)
//          │                                ▲        │
//          └─▶ revise (freelancer feedback) ─┴─ revise ◀┘ (quality < bar, at most twice)
//
// Human-in-the-loop without a server-side checkpointer: the run ends at "awaiting review",
// the browser keeps the state, and feedback re-enters the graph at `revise`. That keeps the
// API stateless, which is what a serverless deployment wants.
import { Annotation, END, START, StateGraph, type LangGraphRunnableConfig } from "@langchain/langgraph";
import { runChecks, type Check } from "./checks";
import { generate } from "./llm";
import * as P from "./prompts";
import { CritiqueSchema, DraftOutputSchema, FitSchema, JobBriefSchema, ReviseOutputSchema, toDraft, type Critique, type Fit, type JobBrief, type Settings } from "./schemas";
import { fitScore, MAX_AUTO_REVISIONS, needsRevision, qualityScore } from "./score";
import { upsertVersions, type AgentSnapshot, type StepId, type TraceEntry, type Version } from "./state";

const last = <T,>() => Annotation<T>({ reducer: (_, b) => b, default: () => null as T });

export const AgentState = Annotation.Root({
  job: Annotation<string>,
  profile: Annotation<string>,
  settings: Annotation<Settings>,
  /** Feedback from the freelancer; when set (and a draft exists) the run starts at `revise`. */
  feedback: last<string | null>(),
  brief: last<JobBrief | null>(),
  fit: last<Fit | null>(),
  fitScore: last<number | null>(),
  versions: Annotation<Version[]>({ reducer: upsertVersions, default: () => [] }),
  critique: last<Critique | null>(),
  checks: last<Check[] | null>(),
  quality: last<number | null>(),
  autoRevisions: Annotation<number>({ reducer: (_, b) => b, default: () => 0 }),
  trace: Annotation<TraceEntry[]>({ reducer: (a, b) => a.concat(b), default: () => [] }),
});
type State = typeof AgentState.State;

// The graph state and the shape the browser keeps must stay identical.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _sameShape: Same<State, AgentSnapshot> = true;
void _sameShape;

export type AgentEvent = { type: "step"; step: StepId; status: "start" };

const announce = (config: LangGraphRunnableConfig, step: StepId) => config.writer?.({ type: "step", step, status: "start" } satisfies AgentEvent);
const current = (s: State) => s.versions.at(-1)!;

async function analyze(s: State, config: LangGraphRunnableConfig) {
  announce(config, "analyze");
  const r = await generate({ step: "analyze", tier: "fast", system: P.ANALYZE_SYSTEM, prompt: P.analyzePrompt(s.job), schema: JobBriefSchema, temperature: 0.2, signal: config.signal });
  return { brief: r.data, trace: [{ step: "analyze" as const, model: r.model, ms: r.ms }] };
}

async function match(s: State, config: LangGraphRunnableConfig) {
  announce(config, "match");
  const r = await generate({ step: "match", tier: "fast", system: P.MATCH_SYSTEM, prompt: P.matchPrompt(s.brief!, s.profile), schema: FitSchema, temperature: 0.2, signal: config.signal });
  return { fit: r.data, fitScore: fitScore(r.data), trace: [{ step: "match" as const, model: r.model, ms: r.ms }] };
}

async function draft(s: State, config: LangGraphRunnableConfig) {
  announce(config, "draft");
  const r = await generate({ step: "draft", tier: "writer", system: P.draftSystem(s.settings), prompt: P.draftPrompt(s.brief!, s.fit!, s.profile), schema: DraftOutputSchema, temperature: 0.7, signal: config.signal });
  const version: Version = { ...toDraft(r.data), version: 1, source: "draft", changes: [] };
  return { versions: [version], trace: [{ step: "draft" as const, model: r.model, ms: r.ms }] };
}

async function review(s: State, config: LangGraphRunnableConfig) {
  announce(config, "review");
  const v = current(s);
  const checks = runChecks(v.proposal, s.brief!, s.settings.length, v.screeningAnswers.filter((a) => a.answer.trim()).length);
  const r = await generate({
    step: "review",
    tier: "fast",
    system: P.CRITIQUE_SYSTEM,
    prompt: P.critiquePrompt(s.brief!, v, checks, s.profile),
    schema: CritiqueSchema,
    temperature: 0.1,
    signal: config.signal,
  });
  const quality = qualityScore(r.data, checks);
  // Stamp the score on the version it judged so the UI can show progress across versions.
  return { critique: r.data, checks, quality, versions: [{ ...v, quality }], trace: [{ step: "review" as const, model: r.model, ms: r.ms }] };
}

async function revise(s: State, config: LangGraphRunnableConfig) {
  announce(config, "revise");
  const v = current(s);
  const fromFeedback = Boolean(s.feedback);
  const r = await generate({
    step: "revise",
    tier: "writer",
    system: P.reviseSystem(s.settings),
    prompt: P.revisePrompt(s.brief!, s.fit!, s.profile, v, s.critique, s.checks ?? [], s.feedback ?? ""),
    schema: ReviseOutputSchema,
    temperature: 0.6,
    signal: config.signal,
  });
  const { changes, ...out } = r.data;
  const next = toDraft(out);
  const version: Version = { ...next, changes, version: v.version + 1, source: fromFeedback ? "feedback" : "auto" };
  return {
    versions: [version],
    autoRevisions: fromFeedback ? s.autoRevisions : s.autoRevisions + 1,
    trace: [{ step: "revise" as const, model: r.model, ms: r.ms }],
  };
}

export function afterReview(s: Pick<State, "feedback" | "quality" | "autoRevisions" | "versions" | "critique">): "revise" | typeof END {
  if (s.feedback) return END;
  // Stop when the last revision didn't improve: another pass rarely helps and costs ~15 s.
  const [prev, latest] = s.versions.slice(-2);
  if (latest && prev && (latest.quality ?? 0) <= (prev.quality ?? 0)) return END;
  return needsRevision(s.critique, s.quality) && s.autoRevisions < MAX_AUTO_REVISIONS ? "revise" : END;
}

export function entry(s: Pick<State, "feedback" | "brief" | "fit" | "versions">): "analyze" | "revise" {
  return s.feedback && s.brief && s.fit && s.versions.length > 0 ? "revise" : "analyze";
}

export function buildGraph() {
  return new StateGraph(AgentState)
    .addNode("analyze", analyze)
    .addNode("match", match)
    .addNode("draft", draft)
    .addNode("review", review)
    .addNode("revise", revise)
    .addConditionalEdges(START, entry, ["analyze", "revise"])
    .addEdge("analyze", "match")
    .addEdge("match", "draft")
    .addEdge("draft", "review")
    .addConditionalEdges("review", afterReview, ["revise", END])
    .addEdge("revise", "review")
    .compile();
}
