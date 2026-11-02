import { CircleHelp, Flag, ListChecks, Megaphone, PackageCheck, Wallet } from "lucide-react";
import type { JobBrief } from "@/lib/agent/schemas";
import { cn } from "@/lib/utils";
import { Panel, SkeletonLines } from "./primitives";

function Block({ icon: Icon, title, children }: { icon: typeof Flag; title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-muted">
        <Icon className="size-3.5" />
        {title}
      </h3>
      {children}
    </div>
  );
}

const List = ({ items }: { items: string[] }) => (
  <ul className="space-y-1 text-[14px] leading-snug text-ink-2">
    {items.map((x) => (
      <li key={x} className="flex gap-2">
        <span className="mt-[7px] size-1 shrink-0 rounded-full bg-ink-2/60" />
        <span>{x}</span>
      </li>
    ))}
  </ul>
);

export function BriefCard({ brief }: { brief: JobBrief | null }) {
  return (
    <Panel eyebrow="1 · The job" title={brief?.title ?? "Reading the post…"}>
      {!brief ? (
        <SkeletonLines lines={5} />
      ) : (
        <div className="space-y-4">
          <p className="text-[15px] leading-relaxed">{brief.summary}</p>

          {(brief.applicationInstructions.length > 0 || brief.screeningQuestions.length > 0) && (
            <div className="rounded-xl border border-ink/15 bg-highlight-soft px-3.5 py-3">
              <Block icon={Megaphone} title="Instructions to applicants">
                <List items={[...brief.applicationInstructions, ...brief.screeningQuestions.filter((q) => !brief.applicationInstructions.includes(q))]} />
              </Block>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Block icon={ListChecks} title="Must-haves">
              <List items={brief.mustHaves} />
            </Block>
            <Block icon={PackageCheck} title="Deliverables">
              <List items={brief.deliverables} />
            </Block>
          </div>

          <Block icon={Wallet} title="Budget & timing">
            <p className="text-[14px] text-ink-2">{brief.budget}</p>
          </Block>

          <Block icon={Flag} title="Client signals">
            <ul className="flex flex-wrap gap-1.5">
              {brief.clientSignals.map((s) => (
                <li
                  key={s.note}
                  className={cn(
                    "rounded-lg border px-2.5 py-1 text-[13px] leading-snug",
                    s.kind === "green" ? "border-pass/25 bg-pass-soft text-pass" : "border-pencil/30 bg-pencil-soft text-pencil",
                  )}
                >
                  {s.kind === "green" ? "＋ " : "⚑ "}
                  {s.note}
                </li>
              ))}
            </ul>
          </Block>

          <Block icon={CircleHelp} title="Ask the client">
            <List items={brief.questionsToAsk} />
          </Block>
        </div>
      )}
    </Panel>
  );
}
