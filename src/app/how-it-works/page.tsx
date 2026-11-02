import { Check, X } from "lucide-react";
import type { Metadata } from "next";
import { AgentGraph } from "@/components/home/agent-graph";
import { Badge, scoreTone } from "@/components/studio/primitives";
import { QUALITY_BAR, MAX_AUTO_REVISIONS } from "@/lib/agent/score";
import { evalReport } from "@/lib/showcase";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "How it works",
  description: "The LangGraph agent behind Bidwright, the checks it runs, and eval results against the real model.",
};

const STEPS = [
  {
    n: "01",
    title: "Read the job",
    model: "fast model",
    body: "Extracts must-haves, deliverables, budget, client signals and every instruction to applicants, quoting the client's own words. Text aimed at AI tools is flagged, never obeyed.",
  },
  {
    n: "02",
    title: "Match your experience",
    model: "fast model",
    body: "Each must-have becomes strong, partial or missing, with the line of your profile that proves it. The fit score is computed in code from that matrix, not guessed by the model.",
  },
  {
    n: "03",
    title: "Write the first draft",
    model: "writer model",
    body: "Opens with the client's problem, uses only facts from your profile, answers screening questions and proposes milestones. Banned phrases and placeholders are spelled out in the prompt.",
  },
  {
    n: "04",
    title: "Critique & check",
    model: "fast model + code",
    body: "A strict-client rubric (hook, specificity, proof, plan, close, honesty) plus 8 deterministic checks. Quality = 80% rubric + 20% checks. A missed screening word or an overclaim caps it at 59.",
  },
  {
    n: "05",
    title: "Revise, then stop",
    model: "writer model",
    body: `Below ${QUALITY_BAR}, or with honesty under 4/5, the graph loops back to revise, at most ${MAX_AUTO_REVISIONS} times, and stops early if a revision doesn't improve. Then it ends at your review. Your feedback re-enters the graph at this step.`,
  },
];

export default function HowItWorks() {
  const { summary, cases, models, generatedAt } = evalReport;
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted">How it works</p>
      <h1 className="mt-2 max-w-3xl font-serif text-[3rem] leading-[1] tracking-tight">An agent with a rubric, a loop and a human at the end.</h1>
      <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-ink-2">
        Bidwright is a LangGraph.js state machine running in a Next.js route handler. Each node calls Gemini with a zod schema as the response schema and validates the reply before it touches state. The browser receives every node&apos;s output as a stream of NDJSON lines.
      </p>

      <div className="mt-10 rounded-2xl border border-line bg-card p-4 sm:p-6">
        <AgentGraph />
      </div>

      <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((s) => (
          <li key={s.n} className="rounded-2xl border border-line bg-card p-5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[13px] text-muted">{s.n}</span>
              <h2 className="text-[17px] font-semibold">{s.title}</h2>
            </div>
            <Badge tone="mark" className="mt-2 font-mono">{s.model}</Badge>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{s.body}</p>
          </li>
        ))}
        <li className="rounded-2xl border-2 border-dashed border-ink/25 p-5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[13px] text-muted">06</span>
            <h2 className="text-[17px] font-semibold">You decide</h2>
          </div>
          <p className="mt-3 text-[14px] leading-relaxed text-ink-2">
            Approve and copy, edit by hand (the checks re-run as you type), or send feedback. The API is stateless: the browser holds the run and sends it back with your feedback, so no server-side session or database is needed.
          </p>
        </li>
      </ol>

      <section id="evals" className="mt-16 scroll-mt-24">
        <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted">Evals</p>
        <h2 className="mt-2 font-serif text-[2.3rem] leading-[1.05] tracking-tight">Tested against the real model, not just mocks.</h2>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-ink-2">
          <code className="rounded bg-sunken px-1.5 py-0.5 font-mono text-[13px]">pnpm record</code> runs the full agent on {summary.cases} job posts (the five samples plus a prompt-injection post and a job outside the profile&apos;s skills) and checks each result against written expectations. Unit tests and CI run the same graph on a deterministic mock.
        </p>

        <dl className="mt-6 grid gap-3 sm:grid-cols-4">
          {[
            ["Expectations met", `${summary.expectationsPassed}/${summary.expectationsTotal}`],
            ["Avg. first draft", `${summary.avgFirstQuality}/100`],
            ["Avg. best version", `${summary.avgFinalQuality}/100`],
            ["Avg. run time", `${summary.avgSeconds} s`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl border border-line bg-card px-4 py-3">
              <dt className="text-[12px] text-muted">{k}</dt>
              <dd className="font-mono text-[1.5rem] font-semibold">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-card">
          <table className="w-full min-w-[720px] text-left text-[13.5px]">
            <thead className="border-b border-line text-[12px] uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Job</th>
                <th className="px-3 py-3 font-semibold">Fit</th>
                <th className="px-3 py-3 font-semibold">Quality</th>
                <th className="px-3 py-3 font-semibold">Versions</th>
                <th className="px-3 py-3 font-semibold">Time</th>
                <th className="px-4 py-3 font-semibold">Expectations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {cases.map((c) => (
                <tr key={c.id} className="align-top">
                  <td className="px-4 py-3 font-medium">{c.label}</td>
                  <td className="px-3 py-3">
                    <Badge tone={scoreTone(c.fitScore)} className="font-mono">{c.fitScore}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 font-mono">
                    {c.firstQuality} → <strong>{c.finalQuality}</strong>
                  </td>
                  <td className="px-3 py-3 font-mono">{c.versions}</td>
                  <td className="px-3 py-3 font-mono">{(c.ms / 1000).toFixed(1)} s</td>
                  <td className="px-4 py-3">
                    <ul className="space-y-0.5">
                      {c.expectations.map((e) => (
                        <li key={e.name} className="flex items-start gap-1.5">
                          {e.pass ? <Check className="mt-0.5 size-3.5 shrink-0 text-pass" strokeWidth={3} /> : <X className="mt-0.5 size-3.5 shrink-0 text-pencil" strokeWidth={3} />}
                          <span className={e.pass ? "text-ink-2" : "font-medium text-pencil"}>{e.name}</span>
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[12.5px] text-muted">
          Run on {new Date(generatedAt).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })} with {models.fast} (fast) and {models.writer} (writer). Model output varies between runs. Source:{" "}
          <a className="underline underline-offset-4" href={`${site.repo}/blob/main/scripts/record.ts`} target="_blank" rel="noreferrer">
            scripts/record.ts
          </a>
          .
        </p>
      </section>
    </div>
  );
}
