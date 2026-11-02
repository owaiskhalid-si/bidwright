import { describe, expect, it } from "vitest";
import { blockingFailures, countWords, requiredOpeners, requiredWords, runChecks } from "./checks";
import type { JobBrief } from "./schemas";

const brief = (over: Partial<JobBrief> = {}): JobBrief => ({
  title: "Booking app",
  summary: "",
  mustHaves: [],
  niceToHaves: [],
  deliverables: [],
  budget: "Not stated",
  clientSignals: [],
  applicationInstructions: [],
  screeningQuestions: [],
  questionsToAsk: [],
  ...over,
});

const GOOD = [
  "Your no-show rate of 14% is the number to move, and reminders with a confirm link are the fastest lever.",
  "For a two-location dental practice I built online booking with Twilio reminders and Stripe deposits; no-shows fell from 11% to 4% in three months.",
  "Your post asks for availability per therapist and location, so the data model starts there. Week one covers availability rules and staging. Weeks two and three cover the booking flow and admin calendar. Week four adds reminders and deposits, then a pilot at one clinic before the rollout to all three.",
  "Patient data would stay in a Canadian region from the first day, which keeps the PHIPA conversation simple.",
  "Could we take 20 minutes this week to walk through your current booking rules and the edge cases your front desk handles by hand?",
].join("\n\n");

describe("instruction extraction", () => {
  it("finds required openers in common phrasings", () => {
    expect(requiredOpeners(['To make sure you read this, start your proposal with the word "Maple".'])).toEqual(["Maple"]);
    expect(requiredOpeners(["Begin your application with 'blue whale'"])).toEqual(["blue whale"]);
    expect(requiredOpeners(["Please answer the questions below"])).toEqual([]);
  });

  it("finds words to include, but not openers", () => {
    expect(requiredWords(['Include the word "pineapple" somewhere in your reply'])).toEqual(["pineapple"]);
    expect(requiredWords(['Start your proposal with "Maple"'])).toEqual([]);
  });
});

describe("runChecks", () => {
  it("passes a specific, well-sized proposal", () => {
    const checks = runChecks(GOOD, brief(), "standard", 0);
    expect(checks.filter((c) => !c.pass).map((c) => c.id)).toEqual([]);
  });

  it("flags a missing required opener as a hard failure", () => {
    const checks = runChecks(GOOD, brief({ applicationInstructions: ['Start your proposal with the word "Maple".'] }), "standard", 0);
    expect(blockingFailures(checks).map((c) => c.id)).toEqual(["opener:Maple"]);
    expect(runChecks(`Maple. ${GOOD}`, brief({ applicationInstructions: ['Start your proposal with the word "Maple".'] }), "standard", 0).every((c) => c.pass)).toBe(true);
  });

  it("requires every screening question to be answered", () => {
    const b = brief({ screeningQuestions: ["Which stack?", "How do you handle double-bookings?"] });
    expect(blockingFailures(runChecks(GOOD, b, "standard", 1)).map((c) => c.id)).toEqual(["screening"]);
    expect(blockingFailures(runChecks(GOOD, b, "standard", 2))).toEqual([]);
  });

  it("catches stock openers, filler, placeholders and a missing close", () => {
    const bad = "Dear Hiring Manager, I hope this message finds you well. I am confident I am the perfect fit.\n\nI have built many apps for [Client Name].";
    const failed = runChecks(bad, brief(), "standard", 0)
      .filter((c) => !c.pass)
      .map((c) => c.id);
    expect(failed).toEqual(expect.arrayContaining(["placeholders", "length", "opener", "filler", "you-focus", "next-step"]));
  });

  it("counts words the way a reader would", () => {
    expect(countWords("It's a 2-location clinic — 14% no-shows.")).toBe(6);
  });
});
