import type { Metadata } from "next";
import { Studio } from "@/components/studio/studio";

export const metadata: Metadata = {
  title: "Studio",
  description: "Paste a job post and watch the agent brief it, score your fit, draft, critique and revise a proposal.",
};

export default function StudioPage() {
  return <Studio />;
}
