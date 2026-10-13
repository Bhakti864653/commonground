import "server-only";

/**
 * The in-app demo guide: a full loop, resident → agents → moderator → office → resident, on
 * EXAMPLE cases only (SV-2026-0001…0008). Sent to the browser only for a signed-in moderator
 * (getDemoGuideAction); visitors never receive any of this. "Start demo" runs Reset demo first,
 * which puts every example case in the starting state these steps rely on:
 *  - SV-2026-0007: a routing suggestion the agent isn't sure about (lighting or parks, 52%)
 *  - SV-2026-0002: a routing suggestion with a likely duplicate (SV-2026-0001)
 *  - SV-2026-0001: its referral approved 7 days ago, so it's overdue for a follow-up, and it is
 *    waiting as "New" in the simulated Street lighting office's inbox
 * The same steps, as a printable sheet: docs/DEMO_CHEATSHEET.md.
 */

/** The number of automated tests (npm test), stated on the closing screen. Update it when it changes. */
export const TEST_COUNT = 696;

export type DemoStep = {
  n: number;
  side: string;
  title: string;
  /** Where to be. */
  where: string;
  /** "Take me there". Absent on the closing screen. */
  href?: string;
  /** The data-demo attribute of the element to highlight on that page. */
  target?: string;
  click: string[];
  say: string;
};

export const DEMO_STEPS: DemoStep[] = [
  {
    n: 1,
    side: "Side 1 · The resident",
    title: "The Guide asks questions and removes the phone number",
    where: "The Guide (/guide)",
    href: "/guide",
    target: "guide-input",
    click: [
      "In the chat box (“Escribe tu pregunta…” / “Type your question…”), type: “Hay basura en la calle, mi teléfono es 6123-4567.” Press Enviar / Send.",
      "Answer its questions (area, since when). Ask it to prepare the report.",
      "In “Borrador para tu revisión” / “Draft for your review”, show the title and urgency, and that the phone number is gone.",
      "Click “Descartar borrador” / “Discard draft”. Don’t submit.",
    ],
    say: "A resident just talks. The AI asks only what it needs, and removes personal details before anything is saved.",
  },
  {
    n: 2,
    side: "Side 1 · The resident",
    title: "An emergency gets 911 at once",
    where: "The Guide (/guide)",
    href: "/guide",
    target: "guide-input",
    click: ["Type: “Hay un cable caído y una persona herida.” Press Enviar / Send.", "Show the instant message ending with “call 911”."],
    say: "Emergencies are caught by rules before any AI runs, so the 911 message never depends on the model.",
  },
  {
    n: 3,
    side: "Side 2 · The agents and the moderator",
    title: "Home: what needs your attention",
    where: "Home (/admin/pipeline)",
    href: "/admin/pipeline",
    target: "attention",
    click: [
      "Point at “What needs your attention”: the suggestions waiting for approval (each with a Review button), and the outbox.",
      "Scroll to “Cases by step”: Drafted → Routed → Referral ready → Office → Follow-up.",
      "Point at “Sending: OFF (demo mode)” at the top.",
    ],
    say: "Every case moves through the same steps. Agents only suggest; I approve every step, and nothing is ever sent.",
  },
  {
    n: 4,
    side: "Side 2 · The agents and the moderator",
    title: "The Routing Agent isn’t sure, so it asks",
    where: "Case SV-2026-0007 (/admin/cases/SV-2026-0007)",
    href: "/admin/cases/SV-2026-0007",
    target: "routing-card",
    click: [
      "Point at the step bar (at “Drafted”) and the Next action button: “Review the routing suggestion”.",
      "In the “Routing Agent” card, show Suggests (office, priority, confidence 52%), Why, “The agent isn’t sure”, and the Second check’s concern.",
      "The office choices are already open: pick Street lighting or Parks, then click “Approve with my changes” (or “Approve”). Wait ~10 s.",
    ],
    say: "The agent looked up similar cases with real tool calls. When two offices fit, it asks a human instead of guessing.",
  },
  {
    n: 5,
    side: "Side 2 · The agents and the moderator",
    title: "The Referral Agent’s message → the outbox",
    where: "Case SV-2026-0007 (/admin/cases/SV-2026-0007)",
    href: "/admin/cases/SV-2026-0007",
    target: "referral-card",
    click: [
      "The Next action is now “Review the message to the office”. In the “Referral Agent” card, show the formal Spanish message (Suggests) and the facts code added (Why).",
      "Click “Change”, change one word, then click “Approve with my changes”.",
      "Under “Outbox for this case”, open the item: “Ready to send – demo mode (not sent)” and the .invalid address. The step bar is now at “Office”.",
    ],
    say: "Code adds the exact facts, so the AI can’t get them wrong. The outbox is a dry run: there is no sending code at all.",
  },
  {
    n: 6,
    side: "Side 2 · The agents and the moderator",
    title: "A likely duplicate",
    where: "Case SV-2026-0002 (/admin/cases/SV-2026-0002)",
    href: "/admin/cases/SV-2026-0002",
    target: "duplicates",
    click: ["In the Routing Agent card, show “Possible duplicate”: SV-2026-0001 · similarity 67%, and the “Merge into SV-2026-0001” button. Don’t click it."],
    say: "Two neighbors reported the same streetlight. Merging would count them as two residents on one case.",
  },
  {
    n: 7,
    side: "Side 2 · The agents and the moderator",
    title: "The Follow-up Agent",
    where: "Home (/admin/pipeline)",
    href: "/admin/pipeline",
    target: "run-follow-up-examples",
    click: [
      "In “Demo tools”, click “Run follow-up now (example cases only)”. Wait up to a minute.",
      "Show “Flagged 1 overdue case (SV-2026-0001)”, then scroll up: “What needs your attention” now lists “Follow-up Agent: no progress for … days”.",
    ],
    say: "This runs every morning by itself. It finds cases that stalled and drafts a reminder, a public update in 7 languages, and whether to raise the priority.",
  },
  {
    n: 8,
    side: "Side 2 · The agents and the moderator",
    title: "The history of every step",
    where: "Case SV-2026-0001 (/admin/cases/SV-2026-0001)",
    href: "/admin/cases/SV-2026-0001",
    target: "audit-log",
    click: [
      "Show the step bar (at “Follow-up”) and the “Follow-up Agent” card: Suggests (reminder, public update, raise priority) and Why. Don’t approve it.",
      "Open “History: everything agents and people did”.",
    ],
    say: "Every step is logged: which agent did what, when and why, and what a moderator approved or changed.",
  },
  {
    n: 9,
    side: "Side 3 · The office",
    title: "The office’s inbox",
    where: "Demo office (/demo/office?office=lighting)",
    href: "/demo/office?office=lighting",
    target: "office-inbox",
    click: ["Point at the red “Simulated office – demo only” banner.", "Show SV-2026-0001: priority, days open, residents, status “New”."],
    say: "This is the other side: what a city department would see. The real portal is built but switched off.",
  },
  {
    n: 10,
    side: "Side 3 · The office",
    title: "The office acts",
    where: "Demo office (/demo/office?office=lighting)",
    href: "/demo/office?office=lighting",
    target: "office-card",
    click: [
      "On SV-2026-0001, click “Mark received”, then “Mark in progress”.",
      "Keep “Public note” selected, type “Cambiaremos la luminaria esta semana.”, click “Add note”. Wait ~10 s.",
    ],
    say: "An office only sees its own cases, never residents’ details. Its public note waits for a moderator.",
  },
  {
    n: 11,
    side: "Side 3 · The office",
    title: "Resolved, then a person confirms",
    where: "Demo office, then case SV-2026-0001 (/admin/cases/SV-2026-0001)",
    href: "/admin/cases/SV-2026-0001",
    target: "office-decisions",
    click: [
      "First, in the Demo office, click “Mark resolved” on SV-2026-0001. Then come here (“Take me there”).",
      "The Next action is “Confirm the office’s fix”. In “…wrote a public note”, check the 7 translations and click “Approve and publish”.",
      "In “…says the problem is resolved”, click “Approve and close the case”. The step bar now ends in “Closed”.",
    ],
    say: "The AI translated the office’s note into 7 languages for me to check. An office can say it’s fixed, but a person confirms before the case closes.",
  },
  {
    n: 12,
    side: "Back to the resident",
    title: "The resident sees it",
    where: "Public case page (/cases/SV-2026-0001)",
    href: "/cases/SV-2026-0001",
    target: "public-timeline",
    click: ["Scroll the timeline: received, in progress, the office’s note, resolved, Closed — each labelled as the simulated office or moderators."],
    say: "Report → agents → office → back to the resident. On a real resident’s case, the page shows only status changes.",
  },
  {
    n: 13,
    side: "The end",
    title: "Closing",
    where: "Anywhere",
    click: [
      "The office portal is built but switched off until the mayor’s office agrees.",
      "Safety: agents only propose, a human approves every step, there is no sending code, personal details are removed, and real cases show only statuses.",
      "TEST_COUNT tests, including ones that block the network to prove nothing is sent.",
      "After I handed out flyers, two real residents sent reports.",
      "Next: show it to the Alcaldía, get real office contacts and a privacy review, then switch the portal on.",
    ],
    say: "It’s a student demo, but every part of the loop really works — and nothing reaches an authority until someone agrees.",
  },
];
