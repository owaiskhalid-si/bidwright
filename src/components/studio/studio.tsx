"use client";

import { Clapperboard, History, PenLine, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AgentSnapshot } from "@/lib/agent/state";
import { RECORDINGS } from "@/lib/recordings";
import { DEFAULT_PROFILE, SAMPLE_JOBS } from "@/lib/samples";
import { cn } from "@/lib/utils";
import { BriefCard } from "./brief-card";
import { CritiqueCard } from "./critique-card";
import { FitCard } from "./fit-card";
import { InputForm, type FormState } from "./input-form";
import { Badge, scoreTone } from "./primitives";
import { ProposalCard } from "./proposal-card";
import { Trace } from "./trace";
import { useAgent, type Mode } from "./use-agent";

interface HistoryEntry {
  id: string;
  at: string;
  title: string;
  fit: number | null;
  quality: number | null;
  totalMs: number;
  snapshot: AgentSnapshot;
}

const KEYS = { profile: "bidwright:profile", settings: "bidwright:settings", history: "bidwright:history" };

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode or quota: the studio still works, it just forgets */
  }
}

const initialForm: FormState = { job: SAMPLE_JOBS[0].text, profile: DEFAULT_PROFILE, settings: { tone: "direct", length: "standard" }, sampleId: SAMPLE_JOBS[0].id };

export function Studio() {
  const [form, setFormState] = useState<FormState>(initialForm);
  const [live, setLive] = useState<boolean | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [editing, setEditing] = useState(true);

  // Browser-only state loads after hydration so server and client render the same first frame.
  useEffect(() => {
    const profile = read<string>(KEYS.profile);
    const settings = read<FormState["settings"]>(KEYS.settings);
    const saved = read<HistoryEntry[]>(KEYS.history);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from localStorage
    setFormState((f) => ({ ...f, profile: profile ?? f.profile, settings: settings ?? f.settings }));
    setHistory(saved ?? []);
    fetch("/api/agent")
      .then((r) => r.json())
      .then((d: { enabled: boolean }) => setLive(Boolean(d.enabled)))
      .catch(() => setLive(false));
  }, []);

  const setForm = (f: FormState) => {
    setFormState(f);
    write(KEYS.profile, f.profile);
    write(KEYS.settings, f.settings);
  };

  const onFinal = useCallback((s: AgentSnapshot, totalMs: number, mode: Mode) => {
    if (mode !== "live") return;
    setHistory((h) => {
      const entry: HistoryEntry = { id: crypto.randomUUID(), at: new Date().toISOString(), title: s.brief?.title ?? "Untitled", fit: s.fitScore, quality: s.quality, totalMs, snapshot: s };
      // A feedback round updates the same job instead of adding a new row.
      const rest = h.filter((x) => !(x.snapshot.job === s.job && x.title === entry.title));
      const next = [entry, ...rest].slice(0, 8);
      write(KEYS.history, next);
      return next;
    });
  }, []);

  const agent = useAgent(onFinal);
  const { view } = agent;
  const running = view.phase === "running";
  const recording = form.sampleId ? RECORDINGS[form.sampleId] : undefined;

  const start = (fn: () => void) => {
    setEditing(false);
    fn();
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  };

  const active = !editing && view.phase !== "idle";
  const s = view.snapshot;
  // The critique on screen always belongs to the newest version that has been reviewed.
  const reviewed = s?.versions.findLast((v) => v.quality != null)?.version;
  const hasDraft = (s?.versions.length ?? 0) > 0;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      {!active ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <div>
            <h1 className="mb-1 font-serif text-[2.4rem] leading-[1.05] tracking-tight sm:text-[2.8rem]">
              Paste a job. <span className="italic">Get a proposal worth sending.</span>
            </h1>
            <p className="mb-6 max-w-xl text-[15px] text-ink-2">
              The agent reads the post, checks your fit against each requirement, drafts, critiques its own work and revises, then stops and waits for you.
            </p>
            <InputForm
              form={form}
              setForm={setForm}
              liveEnabled={live}
              running={running}
              canReplay={Boolean(recording)}
              onRun={() => start(() => agent.run({ job: form.job, profile: form.profile, settings: form.settings }))}
              onReplay={() => recording && start(() => agent.replay(recording))}
              onStop={agent.stop}
            />
          </div>
          <aside className="space-y-4 lg:pt-[5.25rem]">
            {view.phase !== "idle" && (
              <button onClick={() => setEditing(false)} className="w-full rounded-2xl border border-ink/20 bg-highlight-soft px-4 py-3 text-left text-[14px] font-medium hover:border-ink/40">
                ← Back to the current run{s?.brief ? `: ${s.brief.title}` : ""}
              </button>
            )}
            <div className="rounded-2xl border border-line bg-card p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">What you get</p>
              <ul className="mt-3 space-y-3 text-[14px] leading-snug">
                {[
                  ["A brief of the job", "must-haves, deliverables, budget, client red flags and any hidden screening instructions."],
                  ["An honest fit score", "each requirement matched to evidence in your profile, gaps named, never invented."],
                  ["A proposal that's been critiqued", "scored by a strict-client rubric and 8 automatic checks, revised until it clears the bar."],
                  ["The final say", "approve, edit by hand, or tell the agent what to change. Nothing is sent for you."],
                ].map(([t, d], i) => (
                  <li key={t} className="flex gap-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink font-mono text-[12px] text-paper">{i + 1}</span>
                    <span>
                      <strong className="font-semibold">{t}</strong>: <span className="text-ink-2">{d}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            {history.length > 0 && (
              <div className="rounded-2xl border border-line bg-card p-5">
                <p className="mb-2 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                  <History className="size-3.5" /> Recent runs · this browser
                </p>
                <ul className="divide-y divide-line">
                  {history.map((h) => (
                    <li key={h.id}>
                      <button
                        className="flex w-full items-center gap-2 py-2 text-left text-[13.5px] hover:text-ink"
                        onClick={() => {
                          agent.load(h.snapshot, h.totalMs);
                          setEditing(false);
                        }}
                      >
                        <span className="min-w-0 flex-1 truncate">{h.title}</span>
                        <Badge tone={scoreTone(h.fit)} className="font-mono">fit {h.fit ?? "–"}</Badge>
                        <Badge tone={scoreTone(h.quality)} className="font-mono">q {h.quality ?? "–"}</Badge>
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  className="mt-2 text-[12px] text-muted underline-offset-4 hover:underline"
                  onClick={() => {
                    setHistory([]);
                    write(KEYS.history, []);
                  }}
                >
                  Clear history
                </button>
              </div>
            )}
          </aside>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                {view.mode === "replay" ? "Recorded run" : view.mode === "saved" ? "Saved run" : "Live run"} · {s?.settings.tone ?? form.settings.tone} · {s?.settings.length ?? form.settings.length}
              </p>
              <h1 className="truncate font-serif text-[1.9rem] leading-tight tracking-tight">{s?.brief?.title ?? "Reading the job post…"}</h1>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)} disabled={running}>
              <PenLine /> Edit inputs
            </Button>
            <Button
              size="sm"
              disabled={running}
              onClick={() => {
                agent.reset();
                setEditing(true);
              }}
            >
              <Plus /> New proposal
            </Button>
          </div>

          <Trace view={view} />

          {view.error && (
            <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-pencil/40 bg-pencil-soft px-4 py-3 text-[14px] text-pencil">
              {view.error}
              {recording && view.mode === "live" && (
                <Button variant="outline" size="sm" className="ml-auto" onClick={() => agent.replay(recording)}>
                  <Clapperboard /> Watch the recorded run instead
                </Button>
              )}
            </div>
          )}

          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)]">
            {/* On narrow screens the brief leads while the agent reads; once a draft exists the proposal moves to the top. */}
            <div className={cn("space-y-4 lg:order-1", hasDraft ? "order-1" : "order-2")}>
              <ProposalCard
                view={view}
                onSelect={agent.select}
                onEdit={agent.edit}
                onApprove={agent.approve}
                onRevise={(f) => void agent.revise(f)}
                canRevise={Boolean(live) && view.mode !== "replay"}
              />
              {(s?.versions.length ?? 0) > 0 && <CritiqueCard critique={s?.critique ?? null} version={reviewed ?? null} />}
            </div>
            <div className={cn("space-y-4 lg:order-2", hasDraft ? "order-2" : "order-1")}>
              <BriefCard brief={s?.brief ?? null} />
              {(s?.brief || running) && <FitCard fit={s?.fit ?? null} score={s?.fitScore ?? null} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
