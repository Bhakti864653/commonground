"use client";

import { useState } from "react";
import { Copy, MessageCircle, Phone, Sparkles } from "lucide-react";
import { reviewReferral } from "@/lib/guide/admin-actions";
import type { AgentSuggestion } from "@/lib/schema/report";
import { MAX_REFERRAL_MESSAGE_LENGTH } from "@/lib/schema/report";
import type { OfficialContact } from "@/lib/schema/community";

const URGENCY_STYLE = {
  low: "bg-status-neutral text-ink",
  medium: "bg-lime/60 text-ink",
  high: "bg-coral/15 text-coral",
} as const;

/** Digits only (plus a leading +) for tel: and wa.me links — same rule as /resources. */
function dialable(phone: string): string {
  return phone.replace(/[^+*0-9]/g, "");
}

/**
 * One AI-prepared referral. Pending: the moderator can edit the Spanish message, then approve or
 * reject. Approved: shows how to reach the office and a copy button — the moderator delivers the
 * message themselves; nothing in CommonGround sends it.
 */
export function ReferralCard({
  caseNumber,
  suggestion,
  contact,
  onChanged,
}: {
  caseNumber: string;
  suggestion: AgentSuggestion & { referral: NonNullable<AgentSuggestion["referral"]> };
  contact: OfficialContact | undefined;
  onChanged: () => void;
}) {
  const { referral } = suggestion;
  const [message, setMessage] = useState(referral.message);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const officeName = contact ? (contact.nameEs ?? contact.name) : `${referral.contactId} (no longer in contacts)`;
  const isPending = suggestion.status === "pending";

  async function review(decision: "approve" | "reject") {
    setBusy(true);
    setError(null);
    const result = await reviewReferral(caseNumber, suggestion.id, decision, decision === "approve" ? message : undefined);
    setBusy(false);
    if (!result.ok) setError(result.reason);
    else onChanged();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(referral.message);
      setCopied(true);
    } catch {
      setError("Couldn't copy automatically — select the message and copy it by hand.");
    }
  }

  return (
    <article
      className={`rounded-md border p-3 text-sm ${isPending ? "border-teal/40 bg-cream" : "border-ink/10 bg-cream"}`}
      aria-label={`Referral to ${officeName}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-mint px-2 py-0.5 text-xs font-semibold text-ink">
          <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-teal" />
          AI-prepared referral
        </span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${URGENCY_STYLE[referral.urgency]}`}>
          Urgency: {referral.urgency}
        </span>
        {referral.urgencyReason && <span className="text-xs text-ink/70">— {referral.urgencyReason}</span>}
        {!isPending && <span className="text-xs text-slate">({suggestion.status})</span>}
      </div>

      <p className="mt-2">
        <span className="font-medium text-ink">Office:</span> {officeName}
      </p>
      {referral.categoryAssessment === "questioned" && (
        <p className="mt-1 text-xs text-coral">
          The AI questioned the category — it suggests “{referral.suggestedCategoryId}”. The referral still uses the
          resident’s category; change it separately if you agree.
        </p>
      )}
      <p className="mt-1 whitespace-pre-wrap text-xs text-ink/70">{suggestion.reasoning}</p>

      {isPending ? (
        <>
          <label htmlFor={`referral-${suggestion.id}`} className="mt-3 block text-xs font-medium text-ink">
            Message to the office (Spanish) — edit before approving
          </label>
          <textarea
            id={`referral-${suggestion.id}`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={MAX_REFERRAL_MESSAGE_LENGTH}
            rows={8}
            className="mt-1 w-full rounded-md border border-ink/15 bg-surface p-2 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
          />
          <p className="mt-1 text-xs text-slate">
            Approving marks the case “referred” and tells residents a moderator approved it. Nothing is sent
            automatically — you deliver the message yourself afterwards.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => review("approve")}
              className="rounded-md bg-teal px-2 py-1 text-xs font-medium text-cream disabled:opacity-50"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => review("reject")}
              className="rounded-md border border-ink/15 px-2 py-1 text-xs font-medium text-ink disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </>
      ) : (
        <p className="mt-3 whitespace-pre-wrap rounded-md border border-ink/10 bg-surface p-2 text-ink/80">{referral.message}</p>
      )}

      {suggestion.status === "approved" && (
        <div className="mt-3 flex flex-col gap-2 rounded-md bg-mint/40 p-2">
          <p className="text-xs font-medium text-ink">Deliver it yourself:</p>
          {contact?.phone ? (
            contact.channel === "whatsapp" ? (
              <a
                href={`https://wa.me/${dialable(contact.phone).replace("+", "")}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-max items-center gap-1.5 text-sm font-semibold text-ink underline"
              >
                <MessageCircle aria-hidden="true" className="h-4 w-4" />
                WhatsApp {contact.phone}
              </a>
            ) : (
              <a href={`tel:${dialable(contact.phone)}`} className="inline-flex w-max items-center gap-1.5 text-sm font-semibold text-ink underline">
                <Phone aria-hidden="true" className="h-4 w-4" />
                Call {contact.phone} (read the message aloud)
              </a>
            )
          ) : (
            <p className="text-xs text-coral">This office has no phone or WhatsApp on file.</p>
          )}
          <button
            type="button"
            onClick={copy}
            className="inline-flex w-max items-center gap-1.5 rounded-md border border-ink/15 bg-surface px-2 py-1 text-xs font-medium text-ink"
          >
            <Copy aria-hidden="true" className="h-3.5 w-3.5" />
            {copied ? "Copied" : "Copy message"}
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs text-coral">
          {error}
        </p>
      )}
    </article>
  );
}
