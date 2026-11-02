// Fictional job posts written for this demo. Any resemblance to a real listing is accidental.
export interface SampleJob {
  id: string;
  label: string;
  category: string;
  text: string;
}

export const SAMPLE_JOBS: SampleJob[] = [
  {
    id: "clinic-booking",
    label: "Clinic booking app",
    category: "Web app",
    text: `Online booking + reminders for a 3-location physiotherapy clinic (Toronto)

We run three physio clinics and still take most bookings by phone. We want patients to book, reschedule and cancel online, and get SMS/email reminders so our no-show rate drops (it is around 14% right now).

Must have:
- Patient-facing booking page (mobile first) showing real availability per therapist and location
- Admin calendar for front-desk staff, with drag to reschedule
- SMS + email reminders 24h and 2h before, with a confirm/cancel link
- Stripe deposit for new patients only
- Data stored in Canada (PHIPA matters to us)

Nice to have: waitlist that auto-offers cancelled slots, simple reporting on no-shows.

Budget: $6,000-8,000 fixed, phased. We'd like a first usable version in 5-6 weeks.

To make sure you read this, start your proposal with the word "Maple".
Please answer:
1. Which stack would you use and why?
2. How would you handle double-bookings when two patients pick the same slot?`,
  },
  {
    id: "lead-automation",
    label: "Lead routing automation",
    category: "Automation",
    text: `Automate our inbound lead flow: Typeform -> HubSpot -> Slack

We're a B2B agency getting ~300 form leads a month. Right now someone copies them into HubSpot by hand and pings the right salesperson. Leads sit for hours.

What we want:
- New Typeform submission creates/updates the HubSpot contact + company (no duplicates)
- Leads scored with simple rules (company size, budget answer, country) and maybe AI for the free-text field
- Route to the right rep by region, post to their Slack channel with a summary
- If no one claims the lead in 30 min, escalate to the sales manager
- Error alerts when something breaks

We're open to Make, Zapier or n8n; tell us which you'd pick. Fixed price around $800-1,200. Please include a short Loom or example of a similar flow you built.`,
  },
  {
    id: "rag-legal",
    label: "RAG chatbot for a law firm",
    category: "AI / RAG",
    text: `AI assistant over our internal precedents and policies (law firm, ~4,000 PDFs)

We want a private chat assistant for our associates that answers questions using only our documents, with citations to the exact page. It must never answer from general knowledge without saying so.

Requirements:
- Ingest PDFs (some scanned), keep them in sync when we add new ones to SharePoint
- Answers with page-level citations and a link to the source
- Access control: some folders are partner-only
- Hosted in our Azure tenant; we have Azure OpenAI but are open to other models
- Evaluation: we want to measure answer quality before rollout

Hourly, $50-80/hr, ~3 months. Experience with legal or other regulated clients strongly preferred.`,
  },
  {
    id: "fitness-app",
    label: "Fitness app like Uber",
    category: "Mobile",
    text: `Need app like uber but for personal trainers

Simple app. Clients find trainers near them, book, pay, chat, rate. Trainers have profile and calendar. Admin panel. iOS and Android. Also web.

Budget $500. Need it in 2 weeks. Must be expert.

Before we hire you must do a small test: build the login and booking screens. We will choose the best one.

Contact me on WhatsApp to discuss faster.`,
  },
  {
    id: "shopify-dashboard",
    label: "Shopify sales dashboard",
    category: "Data",
    text: `Sales & inventory dashboard for our Shopify store (2 stores, CA + US)

We sell outdoor gear on two Shopify stores and track everything in spreadsheets. We'd like one dashboard: revenue, margin by product, inventory days-of-cover, top/bottom SKUs, and ad spend from Meta + Google so we can see ROAS per channel.

- Daily sync, history from Jan 2024
- CAD/USD handled properly
- Login for 4 people
- Bonus: alert when a top SKU is under 14 days of stock

Tell us what you'd build it with and roughly how long. Budget is flexible for the right person; we'd start with a paid discovery call.`,
  },
];

export const DEFAULT_PROFILE = `Demo profile — replace with your own.

Full-stack & AI developer, 7 years. Next.js, React, Node.js, TypeScript, PostgreSQL, Python.
- Built a booking + reminders system for a 2-location dental practice: online booking, Twilio SMS reminders, Stripe deposits. No-shows fell from 11% to 4% in 3 months.
- Built and maintain 20+ n8n and Make automations for agencies (HubSpot, Pipedrive, Slack, Google Sheets), incl. lead scoring with an LLM.
- Shipped a RAG assistant over 1,200 policy PDFs for an insurance broker: pgvector, citations, an eval set of 150 questions. Answer accuracy went from 71% to 89% after retrieval tuning.
- React Native (Expo) app for a gym chain, 15k installs.
- AWS (Lambda, RDS, S3) and Vercel; CI/CD with GitHub Actions. Based in Canada (Eastern time).`;
