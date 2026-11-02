import { connection } from "next/server";
import { aiEnabled, isMock, modelFor } from "@/lib/agent/llm";
import { RequestSchema, runAgent } from "@/lib/agent/run";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 120;

const noStore = { "cache-control": "no-store" };

/** Tells the studio whether live runs are available on this deployment. */
export async function GET() {
  await connection();
  const enabled = aiEnabled();
  return Response.json(
    { enabled, mock: isMock(), models: enabled ? { fast: modelFor("fast"), writer: modelFor("writer") } : null },
    { headers: noStore },
  );
}

/** Runs the proposal agent and streams one JSON object per line as each step starts and finishes. */
export async function POST(req: Request) {
  if (!aiEnabled()) {
    return Response.json({ error: "Live runs aren't configured on this deployment. Try a recorded example." }, { status: 503, headers: noStore });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
  const limit = rateLimit(`${ip}:agent`);
  if (!limit.ok) {
    return Response.json(
      { error: `That's a lot of proposals. Try again in ${Math.max(1, Math.ceil(limit.retryAfter / 60))} min.` },
      { status: 429, headers: { ...noStore, "Retry-After": String(limit.retryAfter) } },
    );
  }

  const parsed = RequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return Response.json({ error: issue?.message ?? "Invalid request." }, { status: 400, headers: noStore });
  }

  const encoder = new TextEncoder();
  const signal = AbortSignal.any([req.signal, AbortSignal.timeout(110_000)]);
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (line: unknown) => controller.enqueue(encoder.encode(JSON.stringify(line) + "\n"));
      try {
        for await (const line of runAgent(parsed.data, signal)) send(line);
      } catch (err) {
        console.error("[api/agent]", err);
        send({ type: "error", message: signal.aborted ? "The run took too long and was stopped. Try again." : "The agent couldn't finish this run. Try again in a moment." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, { headers: { ...noStore, "content-type": "application/x-ndjson; charset=utf-8", "x-accel-buffering": "no" } });
}
