import type { AuditEntry, Critique, OutboxItem, OutputSource, Priority } from "@/lib/pipeline/types";
import { OUTBOX_STATUS_LABEL } from "@/lib/pipeline/sending";

/**
 * Small shared pieces of the moderator's pipeline views, including the ones that make the
 * human-in-the-loop visible: who made each suggestion (an AI agent, the office, rules), that it
 * waits for a person, and who did each step in the history. Icons always come with a text label.
 */

function BotIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2.5" y="5" width="11" height="8" rx="2" />
      <path d="M8 2.5V5M6 9h.01M10 9h.01" strokeLinecap="round" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="5.5" r="2.75" />
      <path d="M2.75 14c.6-2.6 2.7-4 5.25-4s4.65 1.4 5.25 4" strokeLinecap="round" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2.5 14h11M3.5 14V6.5L8 3.5l4.5 3V14M6.5 14v-3.5h3V14" strokeLinejoin="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 5v3l2 1.5" strokeLinecap="round" />
    </svg>
  );
}

/** "Suggested by the Routing Agent", "From the office": who made a suggestion, at the top of its card. */
export function MadeBy({ text, by = "agent" }: { text: string; by?: "agent" | "office" }) {
  return (
    <p className={`flex items-center gap-1.5 text-xs font-semibold ${by === "agent" ? "text-teal" : "text-ink"}`}>
      {by === "agent" ? <BotIcon /> : <BuildingIcon />}
      {text}
    </p>
  );
}

/** A suggestion nobody has decided on yet. */
export function WaitingForHuman() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-coral/10 px-2 py-0.5 text-xs font-medium text-coral">
      <PersonIcon />
      Waiting for human approval
    </span>
  );
}

/** The day a person decided, e.g. "Oct 14, 2026". */
export function decidedOn(iso?: string): string {
  return iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
}

/** "✓ Approved by moderator · Oct 14, 2026" (or Dismissed). Never the moderator's email. */
export function HumanDecision({ status, at }: { status: "approved" | "rejected"; at?: string }) {
  const when = decidedOn(at);
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${status === "approved" ? "text-teal" : "text-slate"}`}>
      <PersonIcon />
      {status === "approved" ? "✓ Approved by moderator" : "Dismissed by moderator"}
      {when && ` · ${when}`}
    </span>
  );
}

export const ACTOR_LABELS: Record<AuditEntry["actorType"], string> = {
  agent: "AI agent",
  moderator: "Human moderator",
  office: "Office",
  system: "System",
};

const ACTOR_STYLES: Record<AuditEntry["actorType"], string> = {
  agent: "bg-teal/10 text-teal",
  moderator: "bg-ink text-cream",
  office: "bg-coral/10 text-coral",
  system: "bg-ink/5 text-slate",
};

/** Who did a step: "AI agent" or "Human moderator" (or the office, or the scheduler), icon + words. */
export function ActorTag({ type }: { type: AuditEntry["actorType"] }) {
  const Icon = { agent: BotIcon, moderator: PersonIcon, office: BuildingIcon, system: ClockIcon }[type];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${ACTOR_STYLES[type]}`}>
      <Icon />
      {ACTOR_LABELS[type]}
    </span>
  );
}

export const PRIORITY_STYLES: Record<Priority, string> = {
  urgent: "bg-coral text-cream",
  high: "bg-coral/15 text-coral",
  medium: "bg-mint/50 text-ink",
  low: "bg-ink/5 text-slate",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[priority]}`}>Priority: {priority}</span>;
}

const SOURCE_LABELS: Record<OutputSource, string> = {
  ai: "AI",
  rules: "Rule-based fallback",
  example: "Example data (written by hand)",
  office: "From the office",
};

export function SourceBadge({ source }: { source: OutputSource }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${source === "ai" ? "bg-teal/10 text-teal" : "bg-ink/5 text-slate"}`}>
      {SOURCE_LABELS[source]}
    </span>
  );
}

/** The Critic Agent's review of a suggestion: "Checked by the Critic Agent". */
export function CritiqueView({ critique }: { critique?: Critique }) {
  if (!critique) return null;
  const by =
    critique.source === "rules"
      ? "Checked by rule checks (the Critic Agent was unavailable)"
      : critique.source === "example"
        ? "Checked by the Critic Agent (example data)"
        : "Checked by the Critic Agent";
  if (critique.verdict === "ok") {
    return <p className="mt-2 text-xs text-teal">✓ {by}: no problems found.</p>;
  }
  return (
    <div className="mt-2 rounded-md border border-coral/30 bg-coral/5 p-2 text-xs">
      <p className="font-semibold text-coral">
        ⚠ {by}: {critique.issues.length === 1 ? "one concern" : `${critique.issues.length} concerns`}
      </p>
      <ul className="mt-1 list-disc pl-4 text-ink/80">
        {critique.issues.map((issue, i) => (
          <li key={i}>
            <span className="font-medium">{issue.type.replace("_", " ")}:</span> {issue.note}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FailureNote({ note }: { note?: string }) {
  if (!note) return null;
  return <p className="mt-2 rounded-md bg-ink/5 p-2 text-xs text-ink/80">ℹ {note}</p>;
}

export function OutboxItemView({ item, showCase = false }: { item: OutboxItem; showCase?: boolean }) {
  return (
    <details className="rounded-md border border-ink/10 bg-cream p-3 text-sm">
      <summary className="cursor-pointer list-none">
        <span className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-ink/5 px-2 py-0.5 text-xs font-semibold text-ink">{OUTBOX_STATUS_LABEL}</span>
          <span className="font-medium text-ink">{item.kind === "referral" ? "Message to the office" : "Reminder to the office"}</span>
          {showCase && item.caseNumber && <span className="text-xs text-slate">{item.caseNumber}</span>}
          <span className="text-xs text-slate">{new Date(item.createdAt).toLocaleString()}</span>
        </span>
      </summary>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-slate">To</dt>
        <dd className="text-ink">
          {item.toLabel} &lt;{item.toAddress}&gt; <span className="text-slate">(placeholder — can never deliver)</span>
        </dd>
        <dt className="text-slate">Subject</dt>
        <dd className="text-ink">{item.subject}</dd>
        <dt className="text-slate">Approved by</dt>
        <dd className="break-all text-ink">{item.approvedBy}</dd>
      </dl>
      <pre className="mt-2 whitespace-pre-wrap break-words rounded bg-surface p-2 font-sans text-xs text-ink/90">{item.bodyEs}</pre>
      {item.translation && (
        <pre className="mt-2 whitespace-pre-wrap break-words rounded bg-surface p-2 font-sans text-xs text-slate">
          [{item.translation.language}] {item.translation.text}
        </pre>
      )}
      <p className="mt-2 text-xs text-slate">Nothing was sent: SENDING_ENABLED is off and CommonGround has no delivery channel.</p>
    </details>
  );
}

const ACTOR_DOT: Record<AuditEntry["actorType"], string> = { agent: "bg-teal", moderator: "bg-ink", system: "bg-slate", office: "bg-coral" };

/** Each step marked "AI agent" or "Human moderator" (or Office / System), so who did what is obvious. */
export function AuditTimeline({ entries, showCase = false }: { entries: AuditEntry[]; showCase?: boolean }) {
  if (entries.length === 0) return <p className="text-sm text-slate">No agent activity yet.</p>;
  return (
    <ol className="flex flex-col gap-2 border-l-2 border-ink/10 pl-4">
      {entries.map((e) => (
        <li key={e.id} className="relative text-sm">
          <span aria-hidden="true" className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ${ACTOR_DOT[e.actorType]}`} />
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate">
            <ActorTag type={e.actorType} />
            <span className="font-semibold text-ink">{e.actor}</span>
            <span>
              · {new Date(e.occurredAt).toLocaleString()}
              {showCase && e.caseNumber && <> · {e.caseNumber}</>}
            </span>
          </p>
          <p className="text-ink/85">{e.summary}</p>
        </li>
      ))}
    </ol>
  );
}
