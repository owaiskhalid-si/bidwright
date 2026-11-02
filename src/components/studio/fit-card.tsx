import { Check, Minus, X } from "lucide-react";
import type { Fit } from "@/lib/agent/schemas";
import { fitLabel } from "@/lib/agent/score";
import { cn } from "@/lib/utils";
import { Badge, Panel, ScoreDial, SkeletonLines } from "./primitives";

const MATCH = {
  strong: { icon: Check, cls: "bg-pass text-white dark:text-[#0e1016]", label: "Strong" },
  partial: { icon: Minus, cls: "bg-warn text-white dark:text-[#0e1016]", label: "Partial" },
  missing: { icon: X, cls: "bg-pencil text-white dark:text-[#0e1016]", label: "Missing" },
} as const;

export function FitCard({ fit, score }: { fit: Fit | null; score: number | null }) {
  const label = score != null ? fitLabel(score) : null;
  return (
    <Panel
      eyebrow="2 · Your fit"
      title={label?.label ?? "Matching…"}
      aside={<ScoreDial value={score} label="Fit" size={64} />}
    >
      {!fit ? (
        <SkeletonLines lines={5} />
      ) : (
        <div className="space-y-4">
          <p className="font-serif text-[1.15rem] italic leading-snug text-ink">“{fit.angle}”</p>

          <ul className="divide-y divide-line rounded-xl border border-line">
            {fit.requirements.map((r) => {
              const m = MATCH[r.match];
              return (
                <li key={r.requirement} className="flex gap-3 px-3 py-2.5">
                  <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full", m.cls)} title={m.label}>
                    <m.icon className="size-3" strokeWidth={3} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium leading-snug">{r.requirement}</p>
                    <p className="text-[13px] leading-snug text-muted">{r.evidence}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          {fit.gaps.length > 0 && (
            <div>
              <h3 className="mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-muted">Gaps, handled honestly</h3>
              <ul className="space-y-2">
                {fit.gaps.map((g) => (
                  <li key={g.gap} className="text-[13.5px] leading-snug">
                    <Badge tone="weak" className="mb-1">{g.gap}</Badge>
                    <p className="text-ink-2">{g.honestFraming}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
