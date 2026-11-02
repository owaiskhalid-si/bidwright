"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import type { Resume, StreamLine } from "@/lib/agent/run";
import type { RunInput } from "@/lib/agent/schemas";
import { applyUpdate, bestVersion, emptySnapshot, type AgentSnapshot, type StepId } from "@/lib/agent/state";
import type { Recording } from "@/lib/recordings";

export interface StepStatus {
  key: string;
  step: StepId;
  status: "running" | "done" | "error";
  model?: string;
  ms?: number;
}

export type Mode = "live" | "replay" | "saved";

export interface AgentView {
  phase: "idle" | "running" | "done" | "error";
  mode: Mode;
  steps: StepStatus[];
  snapshot: AgentSnapshot | null;
  error: string | null;
  totalMs: number | null;
  /** Version the freelancer approved, if any. */
  approved: number | null;
  /** Version shown in the editor. */
  selected: number | null;
  /** Hand edits per version, kept separate so the agent's own text stays inspectable. */
  edits: Record<number, string>;
  runId: number;
}

type Action =
  | { type: "start"; mode: Mode; base: AgentSnapshot | null; keepSteps: boolean }
  | { type: "line"; line: StreamLine }
  | { type: "fail"; message: string }
  | { type: "load"; snapshot: AgentSnapshot; mode: Mode; totalMs: number | null }
  | { type: "approve"; version: number | null }
  | { type: "select"; version: number }
  | { type: "edit"; version: number; text: string }
  | { type: "reset" };

const initial: AgentView = { phase: "idle", mode: "live", steps: [], snapshot: null, error: null, totalMs: null, approved: null, selected: null, edits: {}, runId: 0 };

function reducer(v: AgentView, a: Action): AgentView {
  switch (a.type) {
    case "start":
      return {
        ...v,
        phase: "running",
        mode: a.mode,
        steps: a.keepSteps ? v.steps : [],
        snapshot: a.base,
        error: null,
        totalMs: a.keepSteps ? v.totalMs : null,
        approved: null,
        edits: a.keepSteps ? v.edits : {},
        selected: a.keepSteps ? v.selected : null,
        runId: v.runId + 1,
      };
    case "line": {
      const line = a.line;
      if (line.type === "step" && line.status === "start") {
        return { ...v, steps: [...v.steps, { key: `${line.step}-${v.steps.length}`, step: line.step, status: "running" }] };
      }
      if (line.type === "step" && line.status === "done") {
        const trace = line.update.trace?.at(-1);
        const idx = v.steps.findLastIndex((s) => s.step === line.step && s.status === "running");
        const steps = [...v.steps];
        const done: StepStatus = { key: `${line.step}-${steps.length}`, step: line.step, status: "done", model: trace?.model, ms: trace?.ms };
        if (idx >= 0) steps[idx] = { ...steps[idx], ...done, key: steps[idx].key };
        else steps.push(done);
        const base = v.snapshot ?? emptySnapshot({ job: "", profile: "", settings: { tone: "direct", length: "standard" } });
        const snapshot = applyUpdate(base, line.update);
        const latest = snapshot.versions.at(-1)?.version ?? null;
        return { ...v, steps, snapshot, selected: latest ?? v.selected };
      }
      if (line.type === "final") {
        // Open on the best-scoring version (after feedback, the one the freelancer asked for).
        const pick = line.state.feedback ? line.state.versions.at(-1) : bestVersion(line.state.versions);
        return { ...v, phase: "done", snapshot: line.state, totalMs: (v.totalMs ?? 0) + line.ms, selected: pick?.version ?? null };
      }
      return reducer(v, { type: "fail", message: line.message });
    }
    case "fail":
      return { ...v, phase: "error", error: a.message, steps: v.steps.map((s) => (s.status === "running" ? { ...s, status: "error" } : s)) };
    case "load":
      return { ...initial, runId: v.runId + 1, phase: "done", mode: a.mode, snapshot: a.snapshot, totalMs: a.totalMs, selected: bestVersion(a.snapshot.versions)?.version ?? null, steps: stepsFromTrace(a.snapshot) };
    case "approve":
      return { ...v, approved: a.version };
    case "select":
      return { ...v, selected: a.version };
    case "edit":
      return { ...v, edits: { ...v.edits, [a.version]: a.text }, approved: v.approved === a.version ? null : v.approved };
    case "reset":
      return { ...initial, runId: v.runId + 1 };
  }
}

const stepsFromTrace = (s: AgentSnapshot): StepStatus[] => s.trace.map((t, i) => ({ key: `${t.step}-${i}`, step: t.step, status: "done", model: t.model, ms: t.ms }));

async function* readLines(res: Response): AsyncGenerator<StreamLine> {
  const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const raw = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (raw) yield JSON.parse(raw) as StreamLine;
    }
  }
  if (buffer.trim()) yield JSON.parse(buffer) as StreamLine;
}

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => (clearTimeout(t), resolve()), { once: true });
  });

export function useAgent(onFinal?: (s: AgentSnapshot, totalMs: number, mode: Mode) => void) {
  const [view, dispatch] = useReducer(reducer, initial);
  const abortRef = useRef<AbortController | null>(null);
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  const stream = useCallback(
    async (body: RunInput & { resume?: Resume }, mode: Mode, base: AgentSnapshot | null) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      dispatch({ type: "start", mode, base, keepSteps: Boolean(body.resume) });
      try {
        const res = await fetch("/api/agent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: ctrl.signal });
        if (!res.ok || !res.body) {
          const err = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(err?.error ?? `Request failed (${res.status})`);
        }
        for await (const line of readLines(res)) {
          dispatch({ type: "line", line });
          if (line.type === "final") onFinal?.(line.state, (viewRef.current.totalMs ?? 0) + line.ms, mode);
        }
      } catch (err) {
        if (ctrl.signal.aborted) return;
        dispatch({ type: "fail", message: err instanceof Error ? err.message : "Something went wrong." });
      }
    },
    [onFinal],
  );

  const run = useCallback((input: RunInput) => stream(input, "live", emptySnapshot(input)), [stream]);

  const revise = useCallback(
    (feedback: string) => {
      const v = viewRef.current;
      const s = v.snapshot;
      if (!s?.brief || !s.fit || s.fitScore == null) return;
      // Hand edits become the text the agent revises from.
      const versions = s.versions.map((x) => (v.edits[x.version] != null ? { ...x, proposal: v.edits[x.version] } : x));
      const resume: Resume = {
        feedback,
        brief: s.brief,
        fit: s.fit,
        fitScore: s.fitScore,
        versions,
        critique: s.critique,
        checks: s.checks,
        quality: s.quality,
        autoRevisions: s.autoRevisions,
      };
      return stream({ job: s.job, profile: s.profile, settings: s.settings, resume }, "live", { ...s, versions, feedback });
    },
    [stream],
  );

  /** Plays a recorded real run back with its original pacing, compressed so it stays watchable. */
  const replay = useCallback(async (rec: Recording) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    dispatch({ type: "start", mode: "replay", base: null, keepSteps: false });
    let prev = 0;
    for (const { t, line } of rec.lines) {
      await wait(Math.min((t - prev) * 0.3, 1600), ctrl.signal);
      if (ctrl.signal.aborted) return;
      prev = t;
      dispatch({ type: "line", line });
    }
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ type: "fail", message: "Stopped." });
  }, []);

  return {
    view,
    run,
    revise,
    replay,
    stop,
    load: (snapshot: AgentSnapshot, totalMs: number | null, mode: Mode = "saved") => dispatch({ type: "load", snapshot, mode, totalMs }),
    approve: (version: number | null) => dispatch({ type: "approve", version }),
    select: (version: number) => dispatch({ type: "select", version }),
    edit: (version: number, text: string) => dispatch({ type: "edit", version, text }),
    reset: () => {
      abortRef.current?.abort();
      dispatch({ type: "reset" });
    },
  };
}
