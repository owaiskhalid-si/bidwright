"use client";

import { Clapperboard, Loader2, RotateCcw, Sparkles, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LENGTHS, LIMITS, TONES, type Settings } from "@/lib/agent/schemas";
import { DEFAULT_PROFILE, SAMPLE_JOBS } from "@/lib/samples";
import { cn } from "@/lib/utils";
import { Segmented } from "./primitives";

const TONE_LABELS = { direct: "Direct", warm: "Warm", technical: "Technical" } as const;
const LENGTH_LABELS = { short: "Short", standard: "Standard", detailed: "Detailed" } as const;

export interface FormState {
  job: string;
  profile: string;
  settings: Settings;
  sampleId: string | null;
}

export function InputForm({
  form,
  setForm,
  liveEnabled,
  running,
  onRun,
  onReplay,
  onStop,
  canReplay,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  liveEnabled: boolean | null;
  running: boolean;
  onRun: () => void;
  onReplay: () => void;
  onStop: () => void;
  canReplay: boolean;
}) {
  const jobOk = form.job.trim().length >= 80;
  const profileOk = form.profile.trim().length >= 40;

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (liveEnabled) onRun();
        else if (canReplay) onReplay();
      }}
    >
      <div>
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <label htmlFor="job" className="font-serif text-[1.35rem] leading-none">
            The job post
          </label>
          <span className={cn("font-mono text-[11px]", form.job.length > LIMITS.job * 0.95 ? "text-pencil" : "text-muted")}>
            {form.job.length.toLocaleString()} / {LIMITS.job.toLocaleString()}
          </span>
        </div>
        <div className="mb-2 flex flex-wrap gap-1.5" aria-label="Sample jobs">
          {SAMPLE_JOBS.map((j) => (
            <button
              key={j.id}
              type="button"
              disabled={running}
              onClick={() => setForm({ ...form, job: j.text, sampleId: j.id })}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[12.5px] transition-colors disabled:opacity-50",
                form.sampleId === j.id ? "border-ink bg-ink text-paper" : "border-line bg-card text-ink-2 hover:border-line-strong hover:text-ink",
              )}
            >
              <span className="opacity-60">{j.category} · </span>
              {j.label}
            </button>
          ))}
        </div>
        <textarea
          id="job"
          value={form.job}
          onChange={(e) => setForm({ ...form, job: e.target.value.slice(0, LIMITS.job), sampleId: null })}
          placeholder="Paste the full job post here, including any questions or instructions for applicants…"
          rows={11}
          disabled={running}
          className="block w-full resize-y rounded-xl border border-line-strong bg-card px-4 py-3 text-[14px] leading-relaxed outline-none placeholder:text-muted focus:border-ink/50 disabled:opacity-70"
        />
      </div>

      <details className="group rounded-xl border border-line bg-card" open={!profileOk}>
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <span className="font-serif text-[1.2rem] leading-none">Your profile</span>
          <span className="truncate text-[12.5px] text-muted">{form.profile.startsWith("Demo profile") ? "demo profile, replace with yours" : "saved in this browser only"}</span>
          <span className="ml-auto text-muted transition-transform group-open:rotate-180" aria-hidden>
            ▾
          </span>
        </summary>
        <div className="border-t border-line px-4 pb-4 pt-3">
          <p className="mb-2 text-[12.5px] text-muted">The agent only uses what&apos;s written here. Real results with numbers make the strongest proposals.</p>
          <textarea
            aria-label="Your profile"
            value={form.profile}
            onChange={(e) => setForm({ ...form, profile: e.target.value.slice(0, LIMITS.profile) })}
            rows={9}
            disabled={running}
            className="block w-full resize-y rounded-lg border border-line bg-paper px-3 py-2 font-mono text-[12.5px] leading-relaxed outline-none focus:border-ink/50"
          />
          <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setForm({ ...form, profile: DEFAULT_PROFILE })}>
            <RotateCcw /> Reset to demo profile
          </Button>
        </div>
      </details>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-muted">Tone</p>
          <Segmented
            label="Tone"
            value={form.settings.tone}
            disabled={running}
            onChange={(tone) => setForm({ ...form, settings: { ...form.settings, tone } })}
            options={TONES.map((t) => ({ value: t, label: TONE_LABELS[t] }))}
          />
        </div>
        <div>
          <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-muted">Length</p>
          <Segmented
            label="Length"
            value={form.settings.length}
            disabled={running}
            onChange={(length) => setForm({ ...form, settings: { ...form.settings, length } })}
            options={LENGTHS.map((l) => ({ value: l, label: LENGTH_LABELS[l] }))}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {running ? (
          <Button type="button" variant="danger" size="lg" onClick={onStop}>
            <Square /> Stop
          </Button>
        ) : (
          <Button type="submit" size="lg" disabled={liveEnabled === null || (liveEnabled ? !jobOk || !profileOk : !canReplay)}>
            {liveEnabled === null ? <Loader2 className="animate-spin" /> : liveEnabled ? <Sparkles /> : <Clapperboard />}
            {liveEnabled === false ? "Watch the recorded run" : "Write my proposal"}
          </Button>
        )}
        {liveEnabled && canReplay && !running && (
          <Button type="button" variant="outline" size="lg" onClick={onReplay}>
            <Clapperboard /> Recorded run
          </Button>
        )}
      </div>
      {liveEnabled === false && (
        <p className="text-[12.5px] text-muted">Live runs are off on this deployment. Pick a sample to watch a real recorded run of the agent.</p>
      )}
      {liveEnabled && !jobOk && form.job.length > 0 && <p className="text-[12.5px] text-warn">Paste the full post, at least a few sentences.</p>}
    </form>
  );
}
