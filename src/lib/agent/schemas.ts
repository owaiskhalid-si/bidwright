// Shapes the model must return at each step, plus the inputs the studio sends.
// The same zod schemas become Gemini's responseJsonSchema and validate the reply.
import * as z from "zod";

export const TONES = ["direct", "warm", "technical"] as const;
export const LENGTHS = ["short", "standard", "detailed"] as const;
export type Tone = (typeof TONES)[number];
export type Length = (typeof LENGTHS)[number];

export const WORD_TARGETS: Record<Length, [number, number]> = {
  short: [80, 140],
  standard: [150, 230],
  detailed: [230, 330],
};

export const SettingsSchema = z.object({
  tone: z.enum(TONES).default("direct"),
  length: z.enum(LENGTHS).default("standard"),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const LIMITS = { job: 8000, profile: 5000, feedback: 600, proposal: 4000 } as const;

export const RunInputSchema = z.object({
  job: z.string().trim().min(80, "Paste the full job post (at least a few sentences).").max(LIMITS.job),
  profile: z.string().trim().min(40, "Add a few lines about your experience.").max(LIMITS.profile),
  settings: SettingsSchema,
});
export type RunInput = z.infer<typeof RunInputSchema>;

// ---------- Step 1: read the job ----------

export const JobBriefSchema = z.object({
  title: z.string().describe("A short, specific title for the job, max 8 words."),
  summary: z.string().describe("Two sentences: what the client wants built and why."),
  mustHaves: z.array(z.string()).describe("3-6 hard requirements, each under 12 words, in the client's terms."),
  niceToHaves: z.array(z.string()).describe("0-4 optional extras the client mentions."),
  deliverables: z.array(z.string()).describe("2-5 concrete things the client expects to receive."),
  budget: z.string().describe("Budget, rate or timeline exactly as stated, or 'Not stated'."),
  clientSignals: z
    .array(z.object({ kind: z.enum(["green", "red"]), note: z.string() }))
    .describe("2-5 signals about the client: clarity, scope realism, budget fit, urgency, risk."),
  applicationInstructions: z
    .array(z.string())
    .describe(
      "Every explicit instruction to applicants, verbatim where short: a word to start with, questions to answer, things to include. Empty if none.",
    ),
  screeningQuestions: z.array(z.string()).describe("Questions the client asks applicants to answer, verbatim. Empty if none."),
  questionsToAsk: z.array(z.string()).describe("2-3 sharp clarifying questions a senior freelancer would ask this client."),
});
export type JobBrief = z.infer<typeof JobBriefSchema>;

// ---------- Step 2: match the freelancer ----------

export const MATCH_LEVELS = ["strong", "partial", "missing"] as const;

export const FitSchema = z.object({
  requirements: z
    .array(
      z.object({
        requirement: z.string().describe("One must-have from the brief, copied as written."),
        match: z.enum(MATCH_LEVELS),
        evidence: z.string().describe("The specific line of the profile that proves it, or what is missing."),
      }),
    )
    .describe("One entry per must-have, in the same order."),
  proofPoints: z
    .array(z.object({ claim: z.string(), whyItMatters: z.string() }))
    .describe("2-3 results or projects from the profile most relevant to this job. Never invent any."),
  gaps: z
    .array(z.object({ gap: z.string(), honestFraming: z.string() }))
    .describe("Requirements the profile does not cover, with an honest way to address each. Empty if none."),
  angle: z.string().describe("One sentence: the strongest reason this client should pick this freelancer."),
});
export type Fit = z.infer<typeof FitSchema>;

// ---------- Step 3: write ----------

const draftExtras = {
  screeningAnswers: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .describe("An answer for every screening question in the brief, 1-3 sentences each. Empty if none."),
  milestones: z
    .array(z.object({ name: z.string(), outcome: z.string() }))
    .describe("2-4 milestones that split the deliverables into reviewable steps."),
};

/** A draft as the app stores it: the cover letter as one text with blank lines between paragraphs. */
export const DraftSchema = z.object({ proposal: z.string(), ...draftExtras });
export type Draft = z.infer<typeof DraftSchema>;

/**
 * What the writer model returns. Paragraphs come back as an array because models are
 * inconsistent about blank lines in a single string; the graph joins them.
 */
export const DraftOutputSchema = z.object({
  paragraphs: z
    .array(z.string())
    .describe("The cover letter as 4-6 short paragraphs in reading order, plain text. No subject line, greeting line, sign-off or placeholders."),
  ...draftExtras,
});
export type DraftOutput = z.infer<typeof DraftOutputSchema>;

export const toDraft = ({ paragraphs, ...rest }: DraftOutput): Draft => ({
  proposal: paragraphs
    .map((p) => p.trim())
    .filter(Boolean)
    .join("\n\n"),
  ...rest,
});

// ---------- Step 4: critique ----------

export const RUBRIC = [
  { id: "hook", label: "Hook", hint: "Opens with the client's problem, not the freelancer's biography." },
  { id: "specificity", label: "Specificity", hint: "Refers to details only this job post contains." },
  { id: "proof", label: "Proof", hint: "Backs claims with real, relevant results from the profile." },
  { id: "plan", label: "Plan", hint: "Shows how the work would actually go." },
  { id: "close", label: "Close", hint: "Ends with one easy, concrete next step." },
  {
    id: "honesty",
    label: "Honesty",
    hint: "Every claim is backed by the profile. No exaggeration ('near-identical', 'guarantees'), no invented tools, clients or numbers.",
  },
] as const;
export type RubricId = (typeof RUBRIC)[number]["id"];

export const CritiqueSchema = z.object({
  scores: z
    .array(
      z.object({
        id: z.enum(RUBRIC.map((r) => r.id) as [RubricId, ...RubricId[]]),
        score: z.number().int().min(1).max(5),
        note: z.string().describe("One sentence explaining the score."),
      }),
    )
    .describe("Exactly one entry for each rubric criterion."),
  edits: z.array(z.string()).describe("2-4 specific edits that would raise the lowest scores. Quote the text to change."),
  verdict: z.string().describe("One sentence overall verdict."),
});
export type Critique = z.infer<typeof CritiqueSchema>;

export const ReviseOutputSchema = DraftOutputSchema.extend({
  changes: z.array(z.string()).describe("2-4 short notes on what changed in this version and why."),
});
