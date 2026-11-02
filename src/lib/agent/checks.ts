// Deterministic checks that run on every draft, next to the model's own critique.
// They catch what an LLM grader tends to wave through: missed applicant instructions,
// stock openers, wrong length, unanswered questions.
import { WORD_TARGETS, type JobBrief, type Length } from "./schemas";

export interface Check {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
  /** Hard checks block approval in the UI until fixed or overridden. */
  hard: boolean;
}

export const countWords = (text: string) => (text.match(/[\p{L}\p{N}'’-]+/gu) ?? []).length;

const STOCK_OPENERS = [
  /^\s*(dear|hello|hi|hey)\s+(hiring manager|sir|madam|there|client)\b/i,
  /i hope (this|you|all)\b.{0,30}\bwell/i,
  /\bi am writing to\b/i,
  /\bi (have|'ve) (carefully )?(read|gone through|reviewed) your (job|project)/i,
  /\bmy name is\b/i,
  /\bi am (an?|the) (expert|experienced|professional|seasoned)\b/i,
];

export const FILLER = [
  "i am confident",
  "look no further",
  "perfect fit",
  "best candidate",
  "dedicated professional",
  "go above and beyond",
  "hardworking",
  "hard-working",
  "100% satisfaction",
  "years of experience in various",
  "i assure you",
  "delve",
  "leverage my expertise",
  "seamless",
  "cutting-edge",
  "tailored solution",
  "guarantee",
];

export const PLACEHOLDER = /\[(your|client|name|company|insert)[^\]]*\]|\{\{[^}]+\}\}|<your [^>]+>|\bXX+\b/i;

/** Pulls the required opening word or phrase out of instructions such as "Start your proposal with 'blue'". */
export function requiredOpeners(instructions: string[]): string[] {
  const out: string[] = [];
  for (const line of instructions) {
    const m = line.match(/\b(?:start|begin|open)\w*\b[^"'“‘]{0,60}?(?:with|using)\b[^"'“‘]{0,20}["'“‘]([^"'”’]{1,40})["'”’]/i);
    if (m) out.push(m[1].trim());
  }
  return out;
}

/** Words the client asks to see somewhere in the proposal, e.g. "include the word 'pineapple'". */
export function requiredWords(instructions: string[]): string[] {
  const out: string[] = [];
  for (const line of instructions) {
    if (/\b(?:start|begin|open)\w*\b/i.test(line)) continue;
    const m = line.match(/\b(?:include|mention|use|write|put)\b[^"'“‘]{0,40}["'“‘]([^"'”’]{1,40})["'”’]/i);
    if (m) out.push(m[1].trim());
  }
  return out;
}

export function runChecks(proposal: string, brief: JobBrief, length: Length, answeredQuestions: number): Check[] {
  const text = proposal.trim();
  const lower = text.toLowerCase();
  const words = countWords(text);
  const [min, max] = WORD_TARGETS[length];
  const firstLine = text.split(/\n+/)[0] ?? "";
  const checks: Check[] = [];

  for (const opener of requiredOpeners(brief.applicationInstructions)) {
    const ok = text.replace(/^[\s"'“‘*_]+/, "").toLowerCase().startsWith(opener.toLowerCase());
    checks.push({
      id: `opener:${opener}`,
      label: `Starts with “${opener}”`,
      pass: ok,
      detail: ok ? "The client's screening word is the first thing they read." : "The client asked for this opener. Posts that miss it are often filtered out unread.",
      hard: true,
    });
  }

  for (const word of requiredWords(brief.applicationInstructions)) {
    const ok = lower.includes(word.toLowerCase());
    checks.push({
      id: `word:${word}`,
      label: `Mentions “${word}”`,
      pass: ok,
      detail: ok ? "Included as the post asks." : "The post asks applicants to include this.",
      hard: true,
    });
  }

  if (brief.screeningQuestions.length > 0) {
    const ok = answeredQuestions >= brief.screeningQuestions.length;
    checks.push({
      id: "screening",
      label: "Answers every screening question",
      pass: ok,
      detail: `${Math.min(answeredQuestions, brief.screeningQuestions.length)} of ${brief.screeningQuestions.length} answered.`,
      hard: true,
    });
  }

  const placeholder = text.match(PLACEHOLDER);
  checks.push({
    id: "placeholders",
    label: "No placeholders left",
    pass: !placeholder,
    detail: placeholder ? `Found “${placeholder[0]}”.` : "Ready to send as written.",
    hard: true,
  });

  checks.push({
    id: "length",
    label: `Length ${min}–${max} words`,
    pass: words >= min * 0.9 && words <= max * 1.1,
    detail: `${words} words.`,
    hard: false,
  });

  const stock = STOCK_OPENERS.find((re) => re.test(firstLine));
  checks.push({
    id: "opener",
    label: "Opening line is about the client",
    pass: !stock,
    detail: stock ? `“${firstLine.slice(0, 70)}${firstLine.length > 70 ? "…" : ""}” reads like a template.` : "No stock greeting or biography opener.",
    hard: false,
  });

  const filler = FILLER.filter((f) => lower.includes(f));
  checks.push({
    id: "filler",
    label: "No filler phrases",
    pass: filler.length === 0,
    detail: filler.length ? `Remove: ${filler.map((f) => `“${f}”`).join(", ")}.` : "No stock phrases found.",
    hard: false,
  });

  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  const iStarts = sentences.filter((s) => /^["'“‘]?I\b/.test(s.trim())).length;
  const ratio = sentences.length ? iStarts / sentences.length : 0;
  checks.push({
    id: "you-focus",
    label: "Focused on the client, not on “I”",
    pass: ratio <= 0.35,
    detail: `${iStarts} of ${sentences.length} sentences start with “I”.`,
    hard: false,
  });

  const lastParagraph = text.split(/\n\s*\n/).filter(Boolean).at(-1) ?? "";
  const hasNextStep = /\?|\b(call|chat|meet|send|share|start|schedule|walk you through|happy to|next step)\b/i.test(lastParagraph);
  checks.push({
    id: "next-step",
    label: "Ends with a clear next step",
    pass: hasNextStep,
    detail: hasNextStep ? "The last paragraph invites a reply." : "The close doesn't ask for anything.",
    hard: false,
  });

  return checks;
}

export const blockingFailures = (checks: Check[]) => checks.filter((c) => c.hard && !c.pass);
