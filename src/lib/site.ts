export const site = {
  name: "Bidwright",
  tagline: "Proposals that read like you studied the job.",
  description:
    "An AI proposal studio for freelancers: a LangGraph agent reads the job post, matches your real experience, drafts, critiques and revises, then waits for your approval.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3300",
  author: process.env.NEXT_PUBLIC_AUTHOR_NAME || "",
  authorUrl: process.env.NEXT_PUBLIC_AUTHOR_URL || "",
  repo: process.env.NEXT_PUBLIC_REPO_URL || "https://github.com/owaiskhalid-si/bidwright",
};
