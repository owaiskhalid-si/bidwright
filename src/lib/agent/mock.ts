// Deterministic stand-in for Gemini (BIDWRIGHT_MOCK=1). It reads the same prompts the real
// model gets, so tests exercise the whole graph: the first draft is deliberately generic,
// the critique scores it low, and the automatic revision fixes it.
import { requiredOpeners } from "./checks";

const section = (prompt: string, tag: string) => prompt.match(new RegExp(`<${tag}>\\n([\\s\\S]*?)\\n</${tag}>`))?.[1] ?? "";
const listItems = (body: string) =>
  body
    .split("\n")
    .map((l) => l.replace(/^-\s*/, "").trim())
    .filter((l) => l && l !== "(none)");

function analyze(prompt: string) {
  const job = section(prompt, "job_post");
  const lines = job.split("\n").map((l) => l.trim());
  const bullets = lines.filter((l) => /^[-•*]\s/.test(l)).map((l) => l.replace(/^[-•*]\s*/, ""));
  const instructions = lines.filter((l) => /\b(start|begin) your (proposal|application)\b|\binclude\b.*["“]/i.test(l));
  const questions = lines.filter((l) => /^\d+[.)]\s/.test(l) && l.endsWith("?")).map((l) => l.replace(/^\d+[.)]\s*/, ""));
  const budget = lines.find((l) => /\$\s?\d/.test(l)) ?? "Not stated";
  return {
    title: (lines.find(Boolean) ?? "Untitled job").split(/\s+/).slice(0, 8).join(" "),
    summary: "The client wants a working system that replaces a manual process. They care about reliability and a phased delivery.",
    mustHaves: (bullets.length ? bullets : ["Working end-to-end solution", "Clear communication"]).slice(0, 5),
    niceToHaves: [],
    deliverables: ["A deployed first version", "Documentation and handover"],
    budget,
    clientSignals: [
      { kind: "green", note: "Specific requirements and a stated budget." },
      { kind: /\$\s?[1-9]\d{0,2}\b(?!,)/.test(budget) ? "red" : "green", note: "Budget looks realistic for the scope." },
    ],
    applicationInstructions: instructions,
    screeningQuestions: questions,
    questionsToAsk: ["What does success look like 3 months after launch?", "Who will own the system day to day?"],
  };
}

function match(prompt: string) {
  const reqs = listItems(section(prompt, "must_haves"));
  const profile = section(prompt, "freelancer_profile").toLowerCase();
  return {
    requirements: reqs.map((requirement, i) => {
      const words = requirement.toLowerCase().match(/[a-z]{5,}/g) ?? [];
      const hits = words.filter((w) => profile.includes(w)).length;
      const m = hits >= 2 ? "strong" : hits === 1 || i % 3 === 0 ? "partial" : "missing";
      return { requirement, match: m, evidence: m === "missing" ? "Not shown in the profile." : "Matches a project listed in the profile." };
    }),
    proofPoints: [{ claim: "Built a booking and reminders system that cut no-shows from 11% to 4%", whyItMatters: "Same problem, measured result." }],
    gaps: [{ gap: "No direct experience in this exact industry", honestFraming: "Name the closest regulated project and how data rules were handled." }],
    angle: "Has shipped this kind of system before and measured the outcome.",
  };
}

function writeProposal(prompt: string, polished: boolean) {
  const opener = requiredOpeners(listItems(section(prompt, "applicant_instructions")))[0];
  const questions = listItems(section(prompt, "screening_questions"));
  const body = polished
    ? [
        `${opener ? `${opener}: ` : ""}cutting no-shows and phone bookings is exactly the problem I solved for a two-location dental practice, where no-shows fell from 11% to 4% in three months.`,
        "Your post mentions real availability per therapist and location, plus reminders with a confirm or cancel link. Those are the two parts that make or break this kind of system, so I'd build and test them first.",
        "Plan: week 1, data model and availability rules; weeks 2-3, patient booking flow and admin calendar; week 4, reminders and Stripe deposits; weeks 5-6, pilot at one location, then roll out.",
        "Data would stay in a Canadian region from day one.",
        "Would a 20-minute call this week work to walk through your current booking rules?",
      ]
    : [
        "Hi there, I hope you are doing well. I am confident I am the perfect fit for this project.",
        "I have many years of experience and I have carefully read your job post. I can build this for you with high quality.",
        "Let me know.",
      ];
  return {
    paragraphs: body,
    screeningAnswers: questions.map((question) => ({ question, answer: "Next.js with Postgres; a database constraint on the slot makes double-booking impossible." })),
    milestones: [
      { name: "Foundations", outcome: "Data model, auth and availability rules running on staging." },
      { name: "Booking flow", outcome: "Patients can book, reschedule and cancel." },
      { name: "Launch", outcome: "Reminders, deposits and a pilot at one location." },
    ],
  };
}

function critique(prompt: string) {
  const proposal = section(prompt, "proposal");
  const generic = /hope you are|perfect fit|i am confident/i.test(proposal);
  const s = generic ? [2, 2, 1, 1, 2, 3] : [5, 4, 5, 4, 4, 5];
  return {
    scores: ["hook", "specificity", "proof", "plan", "close", "honesty"].map((id, i) => ({ id, score: s[i], note: generic ? "Generic; could be sent to any job." : "Specific to this post." })),
    edits: generic
      ? ["Replace “Hi there, I hope you are doing well” with the client's problem.", "Replace “many years of experience” with the dental-practice result."]
      : ["Tighten the plan paragraph."],
    verdict: generic ? "Reads like a template; it would be skipped." : "Specific, credible and easy to reply to.",
  };
}

export function mockReply(step: string, prompt: string): unknown {
  switch (step) {
    case "analyze":
      return analyze(prompt);
    case "match":
      return match(prompt);
    case "draft":
      return writeProposal(prompt, false);
    case "review":
      return critique(prompt);
    case "revise":
      return { ...writeProposal(prompt, true), changes: ["Opened with the client's problem.", "Added a measured result and a week-by-week plan."] };
    default:
      throw new Error(`No mock for step ${step}`);
  }
}
