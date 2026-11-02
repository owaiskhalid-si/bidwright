// Calls a running server's /api/agent the way the studio does and checks the stream.
// CI starts the production build on the mock model and runs `pnpm smoke http://localhost:3300`.
import type { StreamLine } from "../src/lib/agent/run";
import { DEFAULT_PROFILE, SAMPLE_JOBS } from "../src/lib/samples";

const base = process.argv[2] ?? "http://localhost:3300";

const status = (await fetch(`${base}/api/agent`).then((r) => r.json())) as { enabled: boolean };
if (!status.enabled) throw new Error("API reports live runs disabled");

const res = await fetch(`${base}/api/agent`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ job: SAMPLE_JOBS[0].text, profile: DEFAULT_PROFILE, settings: { tone: "direct", length: "standard" } }),
});
if (!res.ok || !res.headers.get("content-type")?.includes("ndjson")) throw new Error(`Bad response: ${res.status}`);

const lines = (await res.text())
  .split("\n")
  .filter(Boolean)
  .map((l) => JSON.parse(l) as StreamLine);
const steps = lines.filter((l) => l.type === "step" && l.status === "done").map((l) => (l as { step: string }).step);
const final = lines.at(-1);
if (final?.type !== "final") throw new Error(`Stream did not finish: ${JSON.stringify(final)}`);
if (final.state.versions.length < 2 || (final.state.quality ?? 0) < 80) throw new Error("Expected an improved second version");

const bad = await fetch(`${base}/api/agent`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ job: "short" }) });
if (bad.status !== 400) throw new Error(`Expected 400 for an invalid request, got ${bad.status}`);

console.log(`OK · ${steps.join(" → ")} · quality ${final.state.quality}`);
