import { annotate } from "@/lib/annotate";
import { cn } from "@/lib/utils";

/** A proposal with editor's marks: highlighter on what was asked for and on hard proof, red pencil on filler. */
export function ProofText({ text, instructions, className }: { text: string; instructions: string[]; className?: string }) {
  return (
    <div className={cn("space-y-3.5 text-[15.5px] leading-[1.7]", className)}>
      {text.split(/\n\s*\n/).map((p, i) => (
        <p key={i} className="whitespace-pre-wrap">
          {annotate(p, instructions).map((seg, j) =>
            seg.kind === "plain" ? (
              <span key={j}>{seg.text}</span>
            ) : seg.kind === "flag" ? (
              <span key={j} className="squiggle" title={seg.note}>
                {seg.text}
              </span>
            ) : (
              <mark key={j} className={cn("mark", seg.kind === "required" && "font-semibold")} title={seg.note}>
                {seg.text}
              </mark>
            ),
          )}
        </p>
      ))}
    </div>
  );
}
