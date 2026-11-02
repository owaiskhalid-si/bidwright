import { Quote } from "lucide-react";
import { RUBRIC, type Critique } from "@/lib/agent/schemas";
import { rubricTotal, RUBRIC_MAX } from "@/lib/agent/score";
import { cn } from "@/lib/utils";
import { Badge, Panel, SkeletonLines } from "./primitives";

const barColor = (n: number) => (n >= 4 ? "bg-pass" : n === 3 ? "bg-warn" : "bg-pencil");

export function CritiqueCard({ critique, version }: { critique: Critique | null; version: number | null }) {
  return (
    <Panel
      eyebrow="4 · The critique"
      title={critique ? "Read by a demanding client" : "Critiquing…"}
      aside={critique ? <Badge className="font-mono">{rubricTotal(critique)}/{RUBRIC_MAX}{version ? ` · v${version}` : ""}</Badge> : null}
    >
      {!critique ? (
        <SkeletonLines lines={6} />
      ) : (
        <div className="space-y-4">
          <p className="flex gap-2 font-serif text-[1.15rem] italic leading-snug">
            <Quote className="mt-1 size-4 shrink-0 text-muted" />
            {critique.verdict}
          </p>
          <ul className="space-y-2.5">
            {RUBRIC.map((r) => {
              const s = critique.scores.find((x) => x.id === r.id);
              const score = s?.score ?? 0;
              return (
                <li key={r.id}>
                  <div className="flex items-baseline gap-2">
                    <span className="w-24 shrink-0 text-[13px] font-semibold">{r.label}</span>
                    <div className="flex flex-1 gap-0.5" aria-label={`${r.label} ${score} of 5`} role="img">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <span key={i} className={cn("h-2 flex-1 rounded-full", i <= score ? barColor(score) : "bg-sunken")} />
                      ))}
                    </div>
                    <span className="w-7 text-right font-mono text-[12px] text-muted">{score}/5</span>
                  </div>
                  {s?.note && <p className="mt-0.5 text-[13px] leading-snug text-muted sm:ml-[6.5rem]">{s.note}</p>}
                </li>
              );
            })}
          </ul>
          {critique.edits.length > 0 && (
            <div>
              <h3 className="mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-muted">Suggested edits</h3>
              <ol className="list-decimal space-y-1 pl-5 text-[13.5px] leading-snug text-ink-2 marker:text-muted">
                {critique.edits.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
