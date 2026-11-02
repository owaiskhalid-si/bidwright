// One call shape for every agent step: system + prompt + zod schema in, validated object out.
// Gemini in production; a deterministic mock (BIDWRIGHT_MOCK=1) for tests, CI and screenshots.
import { GoogleGenAI } from "@google/genai";
import * as z from "zod";
import { mockReply } from "./mock";

export type Tier = "fast" | "writer";

export interface GenerateOptions<T extends z.ZodType> {
  step: string;
  tier: Tier;
  system: string;
  prompt: string;
  schema: T;
  temperature?: number;
  signal?: AbortSignal;
}

export interface Generated<T> {
  data: T;
  model: string;
  ms: number;
}

export const DEFAULT_MODELS: Record<Tier, string> = {
  fast: "gemini-3.5-flash-lite",
  writer: "gemini-3.6-flash",
};

export const isMock = () => process.env.BIDWRIGHT_MOCK === "1";
export const aiEnabled = () => isMock() || Boolean(process.env.GEMINI_API_KEY);

export function modelFor(tier: Tier): string {
  const env = tier === "fast" ? process.env.GEMINI_MODEL : process.env.GEMINI_WRITER_MODEL;
  return env?.trim() || DEFAULT_MODELS[tier];
}

/** Writer first, then the fast model: a busy model should slow a run down, not fail it. */
export function modelChain(tier: Tier): string[] {
  return [...new Set([modelFor(tier), modelFor("fast")])];
}

let client: GoogleGenAI | null = null;
const gemini = () => (client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }));

const retryable = (err: unknown) => /\b(429|500|503|504)\b|UNAVAILABLE|RESOURCE_EXHAUSTED|overloaded|high demand/i.test(String(err));
const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => (clearTimeout(t), reject(signal.reason)), { once: true });
  });

export async function generate<T extends z.ZodType>(opts: GenerateOptions<T>): Promise<Generated<z.infer<T>>> {
  const started = Date.now();
  if (isMock()) {
    await sleep(Number(process.env.BIDWRIGHT_MOCK_DELAY ?? 250), opts.signal);
    return { data: opts.schema.parse(mockReply(opts.step, opts.prompt)), model: "mock", ms: Date.now() - started };
  }

  let lastError: unknown;
  for (const model of modelChain(opts.tier)) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await gemini().models.generateContent({
          model,
          contents: opts.prompt,
          config: {
            systemInstruction: opts.system,
            temperature: opts.temperature ?? 0.4,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
            responseJsonSchema: z.toJSONSchema(opts.schema, { io: "input" }),
            abortSignal: opts.signal,
          },
        });
        const text = res.text ?? "";
        if (!text) throw new Error(`${model} returned no text (${res.candidates?.[0]?.finishReason ?? "no candidate"})`);
        return { data: opts.schema.parse(JSON.parse(text)), model, ms: Date.now() - started };
      } catch (err) {
        if (opts.signal?.aborted) throw err;
        lastError = err;
        // Malformed JSON gets one more try on the same model; a busy model gets a short backoff.
        if (!retryable(err) && !(err instanceof SyntaxError || err instanceof z.ZodError)) break;
        if (attempt === 0) await sleep(retryable(err) ? 1200 : 0, opts.signal);
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
