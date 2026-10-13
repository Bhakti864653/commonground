import type { AuditEntry, Critique, OutboxItem, OutputSource, Priority } from "@/lib/pipeline/types";
import { OUTBOX_STATUS_LABEL } from "@/lib/pipeline/sending";

/** Small shared pieces of the moderator's pipeline views. */

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

/** The Critic Agent's review of a suggestion, in plain words: "Second check". */
export function CritiqueView({ critique }: { critique?: Critique }) {
  if (!critique) return null;
  const by = critique.source === "rules" ? "Second check (rule checks only)" : critique.source === "example" ? "Second check (example data)" : "Second check (Critic Agent)";
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

export function AuditTimeline({ entries, showCase = false }: { entries: AuditEntry[]; showCase?: boolean }) {
  if (entries.length === 0) return <p className="text-sm text-slate">No agent activity yet.</p>;
  return (
    <ol className="flex flex-col gap-2 border-l-2 border-ink/10 pl-4">
      {entries.map((e) => (
        <li key={e.id} className="relative text-sm">
          <span aria-hidden="true" className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ${ACTOR_DOT[e.actorType]}`} />
          <p className="text-xs text-slate">
            <span className="font-semibold text-ink">{e.actor}</span> ({e.actorType}) · {new Date(e.occurredAt).toLocaleString()}
            {showCase && e.caseNumber && <> · {e.caseNumber}</>}
          </p>
          <p className="text-ink/85">{e.summary}</p>
        </li>
      ))}
    </ol>
  );
}
