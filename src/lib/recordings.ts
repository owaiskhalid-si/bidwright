// Real Gemini runs recorded by `pnpm record`, replayed in the studio so the demo works
// even when the live API is rate-limited or switched off.
import type { StreamLine } from "./agent/run";
import type { Settings } from "./agent/schemas";
import clinic from "@/data/recordings/clinic-booking.json";
import dashboard from "@/data/recordings/shopify-dashboard.json";
import fitness from "@/data/recordings/fitness-app.json";
import lead from "@/data/recordings/lead-automation.json";
import rag from "@/data/recordings/rag-legal.json";

export interface Recording {
  sampleId: string;
  recordedAt: string;
  settings: Settings;
  models: { fast: string; writer: string };
  lines: Array<{ t: number; line: StreamLine }>;
}

export const RECORDINGS = Object.fromEntries(
  ([clinic, lead, rag, fitness, dashboard] as unknown as Recording[]).map((r) => [r.sampleId, r]),
) as Record<string, Recording>;
