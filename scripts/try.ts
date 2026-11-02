// Runs the agent once from the terminal: `pnpm try [sampleId] [--feedback "..."]`.
import { runAgent } from "../src/lib/agent/run";
import { DEFAULT_PROFILE, SAMPLE_JOBS } from "../src/lib/samples";

const id = process.argv[2] ?? SAMPLE_JOBS[0].id;
const job = SAMPLE_JOBS.find((j) => j.id === id) ?? SAMPLE_JOBS[0];
const fbIndex = process.argv.indexOf("--feedback");
const feedback = fbIndex > 0 ? process.argv[fbIndex + 1] : "";

async function run(resume?: Parameters<typeof runAgent>[0]["resume"]) {
  let final;
  for await (const line of runAgent({ job: job.text, profile: DEFAULT_PROFILE, settings: { tone: "direct", length: "standard" }, resume })) {
    if (line.type === "step") console.log(line.status === "start" ? `▶ ${line.step}` : `✓ ${line.step}`);
    else if (line.type === "final") final = line;
  }
  if (!final) throw new Error("no final state");
  const s = final.state;
  console.log(`\n${s.brief?.title} | fit ${s.fitScore} | quality ${s.quality} | ${s.versions.length} version(s) | ${final.ms} ms`);
  console.log(s.trace.map((t) => `${t.step}:${t.model}:${t.ms}ms`).join("  "));
  console.log("checks:", (s.checks ?? []).map((c) => `${c.pass ? "✓" : "✗"} ${c.label}`).join(" | "));
  console.log(`\n--- v${s.versions.at(-1)!.version} ---\n${s.versions.at(-1)!.proposal}\n`);
  return s;
}

const s = await run();
if (feedback) {
  const { brief, fit, fitScore, versions, critique, checks, quality, autoRevisions } = s;
  await run({ feedback, brief: brief!, fit: fit!, fitScore: fitScore!, versions, critique, checks, quality, autoRevisions });
}
