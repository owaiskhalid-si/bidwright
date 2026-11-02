import { ArrowRight, Check, Flag, ScanSearch, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { AgentGraph } from "@/components/home/agent-graph";
import { Badge, scoreTone } from "@/components/studio/primitives";
import { ProofText } from "@/components/studio/proof-text";
import { Button } from "@/components/ui/button";
import { RUBRIC } from "@/lib/agent/schemas";
import { bestVersion } from "@/lib/agent/state";
import { evalReport, finalSnapshot } from "@/lib/showcase";

const STACK = ["Next.js 16", "LangGraph.js", "Gemini (structured output)", "zod", "TypeScript", "Vitest", "GitHub Actions", "Vercel"];

export default function Home() {
  const sample = finalSnapshot("clinic-booking");
  const v = sample ? bestVersion(sample.versions) : undefined;
  const { summary } = evalReport;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="paper-grain pointer-events-none absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:py-20">
          <div className="flex flex-col justify-center">
            <p className="mb-4 font-mono text-[12px] uppercase tracking-[0.16em] text-muted">AI proposal studio for freelancers</p>
            <h1 className="font-serif text-[3.1rem] leading-[0.98] tracking-tight sm:text-[4.3rem]">
              Proposals that read like you <mark className="mark italic">studied the job.</mark>
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-ink-2">
              Paste a job post. An agent reads it like a senior freelancer, checks your fit requirement by requirement, drafts, critiques its own work as a strict client would, and revises. Then it stops and waits for you.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/studio">
                  Open the studio <ArrowRight />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/how-it-works">How the agent works</Link>
              </Button>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-line pt-6">
              <div>
                <dt className="text-[12px] text-muted">Quality after self-critique</dt>
                <dd className="whitespace-nowrap font-mono text-[1.1rem] font-semibold sm:text-[1.35rem]">
                  {summary.avgFirstQuality} <span className="text-muted">→</span> {summary.avgFinalQuality}
                </dd>
              </div>
              <div>
                <dt className="text-[12px] text-muted">Eval expectations met</dt>
                <dd className="whitespace-nowrap font-mono text-[1.1rem] font-semibold sm:text-[1.35rem]">
                  {summary.expectationsPassed}/{summary.expectationsTotal}
                </dd>
              </div>
              <div>
                <dt className="text-[12px] text-muted">Avg. time per proposal</dt>
                <dd className="whitespace-nowrap font-mono text-[1.1rem] font-semibold sm:text-[1.35rem]">{summary.avgSeconds} s</dd>
              </div>
            </dl>
          </div>

          {/* A real recorded output, marked up */}
          {sample && v && (
            <figure className="relative">
              <div className="absolute -right-3 -top-3 z-10 rotate-2 rounded-lg bg-highlight px-3 py-1.5 font-mono text-[12px] font-semibold text-[#14161d] shadow-md">
                real output · Gemini
              </div>
              <div className="rounded-2xl border border-line bg-card shadow-[0_30px_60px_-30px_rgba(20,24,36,.35)]">
                <div className="flex items-center gap-2 border-b border-line px-5 py-3">
                  <span className="truncate text-[13px] font-semibold">{sample.brief?.title}</span>
                  <Badge tone={scoreTone(sample.fitScore)} className="ml-auto font-mono">fit {sample.fitScore}</Badge>
                  <Badge tone={scoreTone(v.quality)} className="font-mono">quality {v.quality}</Badge>
                </div>
                <div className="max-h-[27rem] overflow-hidden px-6 py-5 [mask-image:linear-gradient(to_bottom,black_78%,transparent)]">
                  <ProofText text={v.proposal} instructions={sample.brief?.applicationInstructions ?? []} className="text-[14.5px]" />
                </div>
                <div className="flex flex-wrap gap-1.5 border-t border-line px-5 py-3">
                  {(sample.checks ?? []).slice(0, 5).map((c) => (
                    <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-sunken px-2 py-0.5 text-[11.5px] text-ink-2">
                      <Check className="size-3 text-pass" strokeWidth={3} /> {c.label}
                    </span>
                  ))}
                </div>
              </div>
              <figcaption className="mt-3 text-[12.5px] text-muted">
                Version {v.version} for a fictional clinic job. <mark className="mark">Highlights</mark> mark the screening word the post asked for and hard proof.
              </figcaption>
            </figure>
          )}
        </div>
      </section>

      {/* The agent */}
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center">
          <div>
            <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted">The agent</p>
            <h2 className="mt-2 font-serif text-[2.4rem] leading-[1.05] tracking-tight">Not one prompt. A loop that checks its own work.</h2>
            <p className="mt-4 text-[16px] leading-relaxed text-ink-2">
              Each step is a node in a LangGraph state machine with its own prompt, model and validated JSON schema. When the critique scores a draft below the bar, the graph sends it back for revision, at most twice. Then it ends and waits: your feedback re-enters at the revise step.
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-card p-4 sm:p-6">
            <AgentGraph />
          </div>
        </div>
      </section>

      {/* What it catches */}
      <section className="border-y border-line bg-card/60">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted">What it catches</p>
          <h2 className="mt-2 max-w-2xl font-serif text-[2.4rem] leading-[1.05] tracking-tight">The things that get proposals skipped.</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: ScanSearch,
                title: "Hidden screening words",
                body: "“Start your proposal with the word Maple.” Clients use this to filter out bulk applications. The agent extracts it, and a hard check blocks approval until it's there.",
              },
              {
                icon: Flag,
                title: "Client red flags",
                body: "A $500 “Uber for trainers” in two weeks, an unpaid test task, “contact me on WhatsApp”. The brief flags them before you spend a Connect.",
              },
              {
                icon: ShieldCheck,
                title: "Overclaiming",
                body: "Every claim is checked against your profile. “Near-identical project” or “guarantees compliance” scores low on honesty and caps the quality score.",
              },
              {
                icon: Sparkles,
                title: "Template smell",
                body: (
                  <>
                    <span className="squiggle">I hope this finds you well</span>, <span className="squiggle">perfect fit</span>, a wall of “I”. Eight deterministic checks run on every version and on your own edits as you type.
                  </>
                ),
              },
            ].map((c) => (
              <div key={c.title} className="rounded-2xl border border-line bg-card p-5">
                <c.icon className="size-5 text-ink" />
                <h3 className="mt-3 text-[16px] font-semibold">{c.title}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rubric + stack */}
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-2">
          <div>
            <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted">The rubric</p>
            <h2 className="mt-2 font-serif text-[2.1rem] leading-[1.05] tracking-tight">Graded like a client who reads 50 proposals a job.</h2>
            <ul className="mt-6 divide-y divide-line rounded-2xl border border-line bg-card">
              {RUBRIC.map((r) => (
                <li key={r.id} className="flex gap-4 px-5 py-3">
                  <span className="w-24 shrink-0 text-[14px] font-semibold">{r.label}</span>
                  <span className="text-[14px] text-ink-2">{r.hint}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted">Built like production software</p>
            <h2 className="mt-2 font-serif text-[2.1rem] leading-[1.05] tracking-tight">Typed, tested, evaluated.</h2>
            <ul className="mt-6 space-y-3 text-[15px] leading-relaxed text-ink-2">
              <li>• Every model reply is validated against a zod schema; malformed or busy-model replies retry, then fall back to a second model.</li>
              <li>• Scores are computed in code from what the model extracted, so they are explainable and repeatable.</li>
              <li>• A deterministic mock model runs the whole graph in unit tests and CI. No API key needed.</li>
              <li>
                • An eval suite of {summary.cases} jobs, including a prompt-injection post, runs against the real model.{" "}
                <Link href="/how-it-works#evals" className="font-medium text-ink underline underline-offset-4">
                  See the results
                </Link>
                .
              </li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-2">
              {STACK.map((s) => (
                <span key={s} className="rounded-full border border-line bg-card px-3 py-1 font-mono text-[12px] text-ink-2">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mb-16 w-full max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-start gap-5 rounded-3xl bg-ink px-8 py-10 text-paper sm:flex-row sm:items-center">
          <h2 className="font-serif text-[2.2rem] leading-[1.05] tracking-tight">
            Try it on a real job post. <span className="italic text-highlight">It takes about 20 seconds.</span>
          </h2>
          <Button size="lg" variant="highlight" className="sm:ml-auto" asChild>
            <Link href="/studio">
              Open the studio <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
