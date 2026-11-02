"use client";

import { Check, CircleAlert, FileSearch, PenLine, RefreshCcw, ScanSearch, UserCheck, Users } from "lucide-react";
import { STEPS, type StepId } from "@/lib/agent/state";
import { cn, formatMs } from "@/lib/utils";
import type { AgentView } from "./use-agent";

const ICONS: Record<StepId, typeof Check> = { analyze: FileSearch, match: Users, draft: PenLine, review: ScanSearch, revise: RefreshCcw };

const shortModel = (m?: string) => m?.replace(/^gemini-/, "").replace(/-preview.*$/, "");

/** The agent's path through the graph, one chip per node execution, as it happens. */
export function Trace({ view }: { view: AgentView }) {
  const awaiting = view.phase === "done";
  return (
    <div className="rise rounded-2xl border border-line bg-card px-4 py-3" aria-live="polite">
      <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-muted">
        <span className="font-mono">Agent trace</span>
        {view.mode === "replay" && <span className="rounded-full bg-highlight-soft px-2 py-0.5 font-mono normal-case tracking-normal text-ink">recorded run</span>}
        {view.totalMs != null && view.phase === "done" && <span className="ml-auto font-mono normal-case tracking-normal">{formatMs(view.totalMs)} total</span>}
      </div>
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-2">
        {view.steps.map((s, i) => {
          const Icon = ICONS[s.step];
          return (
            <li key={s.key} className="flex items-center gap-1">
              {i > 0 && <span className="h-px w-3 bg-line-strong" aria-hidden />}
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border py-1 pl-1.5 pr-2.5 text-[13px]",
                  s.status === "running" && "border-ink/30 bg-highlight-soft",
                  s.status === "done" && "border-line bg-paper",
                  s.status === "error" && "border-pencil/40 bg-pencil-soft text-pencil",
                )}
              >
                <span className={cn("grid size-5 place-items-center rounded-full", s.status === "done" ? "bg-ink text-paper" : "bg-card")}>
                  {s.status === "running" ? (
                    <span className="pulse-dot size-2 rounded-full bg-ink" />
                  ) : s.status === "error" ? (
                    <CircleAlert className="size-3.5" />
                  ) : (
                    <Icon className="size-3" />
                  )}
                </span>
                <span className="font-medium">{STEPS[s.step]}</span>
                {s.status === "done" && s.ms != null && (
                  <span className="font-mono text-[11px] text-muted" title={s.model}>
                    {formatMs(s.ms)} · {shortModel(s.model)}
                  </span>
                )}
              </span>
            </li>
          );
        })}
        {awaiting && (
          <li className="flex items-center gap-1">
            <span className="h-px w-3 bg-line-strong" aria-hidden />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-ink/40 py-1 pl-1.5 pr-2.5 text-[13px] font-medium">
              <span className="grid size-5 place-items-center rounded-full bg-highlight text-[#14161d]">
                <UserCheck className="size-3" />
              </span>
              Waiting for your review
            </span>
          </li>
        )}
      </ol>
    </div>
  );
}
