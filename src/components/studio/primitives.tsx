import { cn } from "@/lib/utils";

export function Panel({
  eyebrow,
  title,
  aside,
  children,
  className,
  id,
}: {
  eyebrow?: string;
  title?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("rise rounded-2xl border border-line bg-card shadow-[0_1px_0_rgba(20,24,36,.04),0_8px_24px_-18px_rgba(20,24,36,.25)]", className)}>
      {(eyebrow || title || aside) && (
        <header className="flex items-start gap-3 border-b border-line px-5 pb-3 pt-4">
          <div className="min-w-0">
            {eyebrow && <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">{eyebrow}</p>}
            {title && <h2 className="mt-0.5 font-serif text-[1.55rem] leading-tight tracking-tight">{title}</h2>}
          </div>
          {aside && <div className="ml-auto shrink-0">{aside}</div>}
        </header>
      )}
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

const TONES = {
  good: "bg-pass-soft text-pass",
  ok: "bg-warn-soft text-warn",
  weak: "bg-pencil-soft text-pencil",
  neutral: "bg-sunken text-ink-2",
  mark: "bg-highlight-soft text-ink",
} as const;
export type Tone = keyof typeof TONES;

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium", TONES[tone], className)}>{children}</span>;
}

export const scoreTone = (score: number | null | undefined): Tone => (score == null ? "neutral" : score >= 80 ? "good" : score >= 60 ? "ok" : "weak");

/** Circular score out of 100. */
export function ScoreDial({ value, label, size = 76 }: { value: number | null; label: string; size?: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const tone = scoreTone(value);
  const color = { good: "var(--pass)", ok: "var(--warn)", weak: "var(--pencil)", neutral: "var(--line-strong)", mark: "var(--highlight)" }[tone];
  return (
    <div className="flex flex-col items-center gap-1" role="img" aria-label={`${label}: ${value ?? "pending"} out of 100`}>
      <svg viewBox="0 0 76 76" width={size} height={size} className="-rotate-90">
        <circle cx="38" cy="38" r={r} fill="none" stroke="var(--sunken)" strokeWidth="7" />
        <circle
          cx="38"
          cy="38"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - ((value ?? 0) / 100) * c}
          style={{ transition: "stroke-dashoffset .8s cubic-bezier(.2,.8,.2,1)" }}
        />
        <text x="38" y="38" transform="rotate(90 38 38)" textAnchor="middle" dominantBaseline="central" className="fill-ink font-mono text-[19px] font-semibold">
          {value ?? "–"}
        </text>
      </svg>
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</span>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  disabled,
}: {
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (v: T) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col rounded-full border border-line bg-sunken p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-full px-3 py-1.5 text-[13px] font-medium text-ink-2 transition-colors hover:text-ink disabled:opacity-50",
            value === o.value && "bg-ink text-paper shadow-[0_1px_2px_rgba(0,0,0,.1)] hover:text-paper",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SkeletonLines({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2.5" aria-hidden>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="h-3 animate-pulse rounded-full bg-sunken" style={{ width: `${92 - ((i * 17) % 40)}%` }} />
      ))}
    </div>
  );
}
