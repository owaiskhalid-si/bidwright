import Link from "next/link";
import { site } from "@/lib/site";
import { Button } from "@/components/ui/button";
import { GithubIcon } from "./github-icon";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme";

const NAV = [
  { href: "/studio", label: "Studio" },
  { href: "/how-it-works", label: "How it works" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
        <Link href="/" className="rounded-md" aria-label="Bidwright home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 text-sm sm:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-full px-3 py-1.5 text-ink-2 transition-colors hover:bg-sunken hover:text-ink">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild>
            <a href={site.repo} target="_blank" rel="noreferrer" aria-label="Source code on GitHub">
              <GithubIcon />
            </a>
          </Button>
          <ThemeToggle />
          <Button size="sm" asChild className="ml-1">
            <Link href="/studio">
              <span className="sm:hidden">Studio</span>
              <span className="hidden sm:inline">Open the studio</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
