// Splits a proposal into marked-up segments for the "editor's proof" view:
// highlighter on what the client asked for and on hard numbers, red pencil on filler.
import { FILLER, PLACEHOLDER, requiredOpeners, requiredWords } from "./agent/checks";

export type SegmentKind = "plain" | "required" | "number" | "flag";
export interface Segment {
  text: string;
  kind: SegmentKind;
  note?: string;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function annotate(text: string, instructions: string[] = []): Segment[] {
  const rules: Array<{ re: RegExp; kind: SegmentKind; note: string }> = [];
  const required = [...requiredOpeners(instructions), ...requiredWords(instructions)];
  if (required.length) rules.push({ re: new RegExp(required.map(escape).join("|"), "gi"), kind: "required", note: "Asked for in the job post" });
  rules.push({ re: new RegExp(FILLER.map(escape).join("|"), "gi"), kind: "flag", note: "Filler: clients skim past this" });
  rules.push({ re: new RegExp(PLACEHOLDER.source, "gi"), kind: "flag", note: "Placeholder left in" });
  rules.push({
    re: /(?:\$\s?)?\b\d[\d,.]*(?:\s?(?:%|k|K|x|hrs?|hours|days|weeks|months|years|installs|users|PDFs|questions))?(?:\s(?:to|→)\s\d[\d,.]*\s?%)?/g,
    kind: "number",
    note: "Concrete proof",
  });

  // Collect non-overlapping matches; earlier rules win.
  const taken: Array<{ start: number; end: number; kind: SegmentKind; note: string }> = [];
  for (const rule of rules) {
    for (const m of text.matchAll(rule.re)) {
      const start = m.index ?? 0;
      const end = start + m[0].length;
      if (m[0].trim().length < 1) continue;
      if (rule.kind === "number" && !/\d{2,}|%|\$|\d\s?(?:weeks|days|months|hours)/.test(m[0])) continue;
      if (taken.some((t) => start < t.end && end > t.start)) continue;
      taken.push({ start, end, kind: rule.kind, note: rule.note });
    }
  }
  taken.sort((a, b) => a.start - b.start);

  const out: Segment[] = [];
  let pos = 0;
  for (const t of taken) {
    if (t.start > pos) out.push({ text: text.slice(pos, t.start), kind: "plain" });
    out.push({ text: text.slice(t.start, t.end), kind: t.kind, note: t.note });
    pos = t.end;
  }
  if (pos < text.length) out.push({ text: text.slice(pos), kind: "plain" });
  return out;
}
