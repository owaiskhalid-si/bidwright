import Link from "next/link";
import { site } from "@/lib/site";
import { LogoMark } from "./logo";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:px-6">
        <div className="flex items-center gap-2">
          <LogoMark className="size-5" />
          <span>
            Bidwright is a portfolio project
            {site.author ? (
              <>
                {" "}by{" "}
                {site.authorUrl ? (
                  <a className="text-ink-2 underline-offset-4 hover:underline" href={site.authorUrl} target="_blank" rel="noreferrer">
                    {site.author}
                  </a>
                ) : (
                  site.author
                )}
              </>
            ) : null}
            . Sample jobs and the demo profile are fictional.
          </span>
        </div>
        <nav className="flex gap-4 sm:ml-auto">
          <Link className="hover:text-ink" href="/studio">Studio</Link>
          <Link className="hover:text-ink" href="/how-it-works">How it works</Link>
          <a className="hover:text-ink" href={site.repo} target="_blank" rel="noreferrer">Source</a>
        </nav>
      </div>
    </footer>
  );
}
