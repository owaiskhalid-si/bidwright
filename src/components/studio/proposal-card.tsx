"use client";

import { Check, CircleAlert, Copy, Download, GitCompareArrows, Highlighter, Loader2, PencilLine, Send, ShieldAlert, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { blockingFailures, countWords, runChecks } from "@/lib/agent/checks";
import { LIMITS, WORD_TARGETS } from "@/lib/agent/schemas";
import type { AgentSnapshot, Version } from "@/lib/agent/state";
import { diffStats, diffWords } from "@/lib/diff";
import { cn } from "@/lib/utils";
import { Badge, Panel, ScoreDial, Segmented, SkeletonLines, scoreTone } from "./primitives";
import { ProofText } from "./proof-text";
import type { AgentView } from "./use-agent";

type ViewMode = "proof" | "edit" | "changes";

const SOURCE_LABEL: Record<Version["source"], string> = { draft: "First draft", auto: "Agent revision", feedback: "Your feedback" };
const QUICK_FEEDBACK = ["Make it shorter", "More technical", "Warmer tone", "Lead with the strongest result", "Ask one sharper question at the end"];

function Changes({ before, after, notes }: { before: string; after: string; notes: string[] }) {
  const parts = useMemo(() => diffWords(before, after), [before, after]);
  const stats = diffStats(parts);
  return (
    <div className="space-y-3">
      {notes.length > 0 && (
        <ul className="space-y-1 rounded-xl bg-sunken px-3.5 py-2.5 text-[13.5px] text-ink-2">
          {notes.map((n) => (
            <li key={n} className="flex gap-2">
              <GitCompareArrows className="mt-0.5 size-3.5 shrink-0 text-muted" />
              {n}
            </li>
          ))}
        </ul>
      )}
      <p className="font-mono text-[12px] text-muted">
        <span className="text-pass">+{stats.added}</span> / <span className="text-pencil">−{stats.removed}</span> words
      </p>
      <p className="whitespace-pre-wrap text-[15px] leading-[1.7]">
        {parts.map((p, i) =>
          p.op === "same" ? (
            <span key={i}>{p.text}</span>
          ) : p.op === "add" ? (
            <ins key={i} className="rounded bg-pass-soft px-0.5 text-pass no-underline">
              {p.text}
            </ins>
          ) : (
            <del key={i} className="mr-1 rounded bg-pencil-soft px-0.5 text-pencil/80">
              {p.text}
            </del>
          ),
        )}
      </p>
    </div>
  );
}

export function ProposalCard({
  view,
  onSelect,
  onEdit,
  onApprove,
  onRevise,
  canRevise,
}: {
  view: AgentView;
  onSelect: (v: number) => void;
  onEdit: (v: number, text: string) => void;
  onApprove: (v: number | null) => void;
  onRevise: (feedback: string) => void;
  canRevise: boolean;
}) {
  const s = view.snapshot as AgentSnapshot | null;
  const [mode, setMode] = useState<ViewMode>("proof");
  const [feedback, setFeedback] = useState("");
  const [override, setOverride] = useState(false);

  const versions = s?.versions ?? [];
  const current = versions.find((v) => v.version === view.selected) ?? versions.at(-1) ?? null;
  const previous = current ? versions.find((v) => v.version === current.version - 1) : undefined;
  const text = current ? (view.edits[current.version] ?? current.proposal) : "";
  const edited = current ? view.edits[current.version] != null && view.edits[current.version] !== current.proposal : false;
  const running = view.phase === "running";
  const isLatest = current?.version === versions.at(-1)?.version;

  const brief = s?.brief ?? null;
  const length = s?.settings.length ?? "standard";
  const answered = current ? current.screeningAnswers.filter((a) => a.answer.trim()).length : 0;
  // Re-run the deterministic checks on whatever is on screen, including hand edits.
  const checks = useMemo(() => (brief ? runChecks(text, brief, length, answered) : []), [brief, length, answered, text]);
  const blocking = blockingFailures(checks);
  const words = countWords(text);
  const [min, max] = s ? WORD_TARGETS[s.settings.length] : [0, 0];

  const fullText = () =>
    [
      text,
      ...(current?.screeningAnswers.length ? ["", "—", ...current.screeningAnswers.map((a) => `${a.question}\n${a.answer}`)] : []),
    ].join("\n\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullText());
      toast.success("Copied. Paste it into the proposal box.");
      return true;
    } catch {
      toast.error("Couldn't reach the clipboard. Select the text and copy it instead.");
      return false;
    }
  };

  const download = () => {
    const blob = new Blob([fullText() + "\n"], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(s?.brief?.title ?? "proposal").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-v${current?.version ?? 1}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const approve = async () => {
    if (!current) return;
    onApprove(current.version);
    await copy();
  };

  const send = (fb: string) => {
    const f = fb.trim();
    if (f.length < 3) return;
    onRevise(f);
    setFeedback("");
    setMode("proof");
  };

  return (
    <Panel
      id="proposal"
      eyebrow="3 · The proposal"
      title={current ? `Version ${current.version}${edited ? " · edited" : ""}` : "Drafting…"}
      aside={<ScoreDial value={edited ? null : (current?.quality ?? null)} label={edited ? "Edited" : "Quality"} size={64} />}
    >
      {!current || !s ? (
        <SkeletonLines lines={8} />
      ) : (
        <div className="space-y-4">
          {/* Version history */}
          <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Versions">
            {versions.map((v, i) => (
              <div key={v.version} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-muted" aria-hidden>→</span>}
                <button
                  role="tab"
                  aria-selected={v.version === current.version}
                  onClick={() => onSelect(v.version)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px] transition-colors",
                    v.version === current.version ? "border-ink bg-ink text-paper" : "border-line bg-paper text-ink-2 hover:border-line-strong",
                  )}
                >
                  <span className="font-semibold">v{v.version}</span>
                  <span className="opacity-80">{SOURCE_LABEL[v.source]}</span>
                  {v.quality != null && (
                    <Badge tone={scoreTone(v.quality)} className="px-1.5 py-0 font-mono text-[11px]">
                      {v.quality}
                    </Badge>
                  )}
                </button>
              </div>
            ))}
            {running && (
              <span className="inline-flex items-center gap-1 text-[12.5px] text-muted">
                <Loader2 className="size-3.5 animate-spin" /> working…
              </span>
            )}
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full sm:w-auto">
              <Segmented
                label="View"
                value={mode}
                onChange={setMode}
                options={[
                  { value: "proof", label: "Proof" },
                  { value: "edit", label: "Edit" },
                  ...(previous ? [{ value: "changes" as const, label: "Changes" }] : []),
                ]}
              />
            </div>
            <span className={cn("font-mono text-[12px]", words < min * 0.9 || words > max * 1.1 ? "text-warn" : "text-muted")}>
              {words} words · target {min}–{max}
            </span>
            <div className="ml-auto flex gap-1">
              <Button variant="ghost" size="sm" onClick={copy}>
                <Copy /> Copy
              </Button>
              <Button variant="ghost" size="sm" onClick={download}>
                <Download /> .txt
              </Button>
            </div>
          </div>

          {/* The document */}
          <div className="paper-grain rounded-xl border border-line bg-paper px-5 py-5 sm:px-7">
            {mode === "edit" ? (
              <textarea
                value={text}
                onChange={(e) => onEdit(current.version, e.target.value.slice(0, LIMITS.proposal))}
                rows={14}
                aria-label="Edit the proposal"
                className="block w-full resize-y bg-transparent text-[15.5px] leading-[1.7] outline-none"
              />
            ) : mode === "changes" && previous ? (
              <Changes before={view.edits[previous.version] ?? previous.proposal} after={text} notes={current.changes} />
            ) : (
              <ProofText text={text} instructions={s.brief?.applicationInstructions ?? []} />
            )}
          </div>
          {mode === "proof" && (
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted">
              <span className="inline-flex items-center gap-1">
                <Highlighter className="size-3.5" /> <mark className="mark">highlight</mark> = asked for, or hard proof
              </span>
              <span>
                <span className="squiggle">squiggle</span> = filler to cut
              </span>
              <span className="inline-flex items-center gap-1">
                <PencilLine className="size-3.5" /> switch to Edit to change anything; checks update as you type
              </span>
            </p>
          )}

          {/* Deterministic checks */}
          <div>
            <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-muted">Checks</h3>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {checks.map((c) => (
                <li key={c.id} className={cn("flex gap-2 rounded-lg border px-2.5 py-2", c.pass ? "border-line" : c.hard ? "border-pencil/40 bg-pencil-soft" : "border-warn/40 bg-warn-soft")}>
                  <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full", c.pass ? "bg-pass text-white dark:text-[#0e1016]" : c.hard ? "bg-pencil text-white" : "bg-warn text-white")}>
                    {c.pass ? <Check className="size-2.5" strokeWidth={3.5} /> : <X className="size-2.5" strokeWidth={3.5} />}
                  </span>
                  <div className="min-w-0 text-[13px] leading-snug">
                    <p className="font-medium">
                      {c.label}
                      {c.hard && !c.pass && <span className="ml-1 text-pencil">· required</span>}
                    </p>
                    <p className="text-muted">{c.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {current.screeningAnswers.length > 0 && (
            <div>
              <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-muted">Screening answers</h3>
              <dl className="space-y-2.5">
                {current.screeningAnswers.map((a) => (
                  <div key={a.question} className="rounded-xl border border-line px-3.5 py-2.5">
                    <dt className="text-[13px] font-semibold">{a.question}</dt>
                    <dd className="mt-0.5 text-[14px] leading-relaxed text-ink-2">{a.answer}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {current.milestones.length > 0 && (
            <div>
              <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-muted">Suggested milestones</h3>
              <ol className="grid gap-2 sm:grid-cols-3">
                {current.milestones.map((m, i) => (
                  <li key={m.name} className="rounded-xl border border-line px-3 py-2.5">
                    <p className="font-mono text-[11px] text-muted">M{i + 1}</p>
                    <p className="text-[13.5px] font-semibold leading-snug">{m.name}</p>
                    <p className="text-[13px] leading-snug text-ink-2">{m.outcome}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Human approval */}
          <div className="rounded-xl border-2 border-dashed border-ink/25 bg-sunken/60 p-4">
            {view.approved === current.version ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="grid size-8 place-items-center rounded-full bg-pass text-white dark:text-[#0e1016]">
                  <Check className="size-4" strokeWidth={3} />
                </span>
                <div>
                  <p className="font-semibold">Approved v{current.version}</p>
                  <p className="text-[13px] text-muted">It&apos;s on your clipboard. Nothing is sent anywhere. You paste it into the platform yourself.</p>
                </div>
                <Button variant="outline" size="sm" className="ml-auto" onClick={() => onApprove(null)}>
                  Undo
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="mr-auto text-[14px] font-semibold">Your call: approve this version, or tell the agent what to change.</p>
                  <Button onClick={approve} disabled={running || (blocking.length > 0 && !override)} variant="highlight">
                    <Check /> Approve & copy
                  </Button>
                </div>
                {blocking.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 text-[13px] text-pencil">
                    <ShieldAlert className="size-4" />
                    {blocking.length === 1 ? "A required check fails" : `${blocking.length} required checks fail`}: {blocking.map((b) => b.label).join(", ")}.
                    <label className="ml-auto inline-flex items-center gap-1.5 text-ink-2">
                      <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} className="accent-[var(--pencil)]" />
                      Approve anyway
                    </label>
                  </div>
                )}
                {canRevise && isLatest ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      send(feedback);
                    }}
                    className="space-y-2"
                  >
                    <div className="flex gap-2">
                      <input
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value.slice(0, LIMITS.feedback))}
                        placeholder="e.g. Mention I can start Monday, and cut the plan to two lines"
                        aria-label="Feedback for the agent"
                        disabled={running}
                        className="h-10 min-w-0 flex-1 rounded-full border border-line-strong bg-card px-4 text-[14px] outline-none placeholder:text-muted focus:border-ink/50"
                      />
                      <Button type="submit" variant="primary" disabled={running || feedback.trim().length < 3}>
                        {running ? <Loader2 className="animate-spin" /> : <Send />} Revise
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_FEEDBACK.map((q) => (
                        <button
                          key={q}
                          type="button"
                          disabled={running}
                          onClick={() => send(q)}
                          className="rounded-full border border-line bg-card px-2.5 py-1 text-[12.5px] text-ink-2 transition-colors hover:border-ink/40 hover:text-ink disabled:opacity-50"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                    {edited && <p className="text-[12.5px] text-muted">Your edits to v{current.version} are what the agent revises from.</p>}
                  </form>
                ) : (
                  <p className="flex items-center gap-1.5 text-[13px] text-muted">
                    <CircleAlert className="size-4" />
                    {!isLatest
                      ? "You're viewing an earlier version. Select the latest one to ask for changes."
                      : "Revisions need a live run. This deployment is showing a recorded run."}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}
