import { cn } from "@/lib/utils";

/** A nib over a highlighter stroke. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-7", className)}>
      <rect x="3" y="19" width="26" height="8" rx="3" fill="var(--highlight)" transform="rotate(-6 16 23)" />
      <path d="M16 3 9.5 15.5 16 25l6.5-9.5L16 3Z" fill="var(--ink)" />
      <path d="M16 12.5v8" stroke="var(--paper)" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="16" cy="12.2" r="1.7" fill="var(--paper)" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="font-serif text-[1.45rem] leading-none tracking-tight">Bidwright</span>
    </span>
  );
}
