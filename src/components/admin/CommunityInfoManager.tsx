"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminAddOfficialContact,
  adminAddTrustedSource,
  adminRemoveCommunityInfoEntry,
  adminReverifyCommunityInfoEntry,
} from "@/lib/store/admin-community-actions";
import type { CommunityConfig } from "@/lib/schema/community";
import type { InfoChangeResult } from "@/lib/store/community-store";
import { sortForReview, sourceFreshness } from "@/lib/sources/freshness";
import { FreshnessBadge } from "@/components/sources/FreshnessBadge";

const input = "rounded-md border border-ink/15 bg-cream px-2 py-1.5 text-sm text-ink";
const today = () => new Date().toISOString().slice(0, 10);

const ERRORS: Record<Exclude<InfoChangeResult, { ok: true }>["error"], string> = {
  invalid:
    "Not saved — check the fields. URLs must start with http:// or https://, and a verified contact needs a source URL and the date you checked it.",
  unknown_community: "Not saved — that community no longer exists (the prototype store may have restarted).",
  not_found: "That entry no longer exists.",
};

const EMPTY_SOURCE = { name: "", url: "", trustLevel: "official_verified" as const, lastVerifiedAt: today(), verificationNote: "" };
const EMPTY_CONTACT = {
  name: "",
  nameEs: "",
  phone: "",
  channel: "phone" as "phone" | "whatsapp",
  url: "",
  isEmergencyService: false,
  verified: true,
  sourceUrl: "",
  lastVerifiedAt: today(),
  verificationNote: "",
};

/**
 * Add and remove a community's approved sources and official contacts. Every field is validated
 * again on the server; this form only collects it. Nothing here is ever invented — a moderator
 * types in what they checked, and where.
 */
export function CommunityInfoManager({ community }: { community: CommunityConfig }) {
  const router = useRouter();
  const [source, setSource] = useState<{
    name: string;
    url: string;
    trustLevel: "official_verified" | "community_trusted";
    lastVerifiedAt: string;
    verificationNote: string;
  }>(EMPTY_SOURCE);
  const [contact, setContact] = useState(EMPTY_CONTACT);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmingReverify, setConfirmingReverify] = useState<string | null>(null);

  const contacts = sortForReview(community.officialContacts);
  const sources = sortForReview(community.trustedSources);
  const needsReview = [...contacts, ...sources].filter((e) => sourceFreshness(e).state !== "current");

  async function run(key: string, fn: () => Promise<InfoChangeResult>, onOk?: () => void) {
    setPending(key);
    setMessage(null);
    const result = await fn();
    setPending(null);
    if (result.ok) {
      onOk?.();
      router.refresh();
    } else {
      setMessage(ERRORS[result.error]);
    }
  }

  /**
   * Re-checking moves the check date to today, so it takes two clicks: nothing is ever marked
   * current without a reviewer saying "I checked this against the source just now".
   */
  function reverifyButton(kind: "source" | "contact", id: string, canReverify: boolean) {
    if (!canReverify) {
      return <span className="text-xs text-slate">Add a source URL before it can be verified.</span>;
    }
    if (confirmingReverify !== id) {
      return (
        <button
          type="button"
          onClick={() => setConfirmingReverify(id)}
          className="shrink-0 rounded-md border border-teal/40 px-2 py-1 text-xs font-medium text-teal"
        >
          Mark re-checked today
        </button>
      );
    }
    return (
      <span className="flex flex-wrap items-center gap-1">
        <span className="text-xs text-ink">Did you just check it against its source?</span>
        <button type="button" onClick={() => setConfirmingReverify(null)} className="rounded-md border border-ink/15 px-2 py-1 text-xs font-medium text-ink">
          Cancel
        </button>
        <button
          type="button"
          disabled={pending === `reverify-${id}`}
          onClick={() => run(`reverify-${id}`, () => adminReverifyCommunityInfoEntry(community.id, kind, id), () => setConfirmingReverify(null))}
          className="rounded-md bg-teal px-2 py-1 text-xs font-medium text-cream disabled:opacity-50"
        >
          Yes, I checked it
        </button>
      </span>
    );
  }

  function removeButton(kind: "source" | "contact", id: string) {
    if (confirmingId !== id) {
      return (
        <button
          type="button"
          onClick={() => setConfirmingId(id)}
          className="shrink-0 rounded-md border border-coral/40 px-2 py-1 text-xs font-medium text-coral"
        >
          Remove
        </button>
      );
    }
    return (
      <span className="flex shrink-0 gap-1">
        <button type="button" onClick={() => setConfirmingId(null)} className="rounded-md border border-ink/15 px-2 py-1 text-xs font-medium text-ink">
          Cancel
        </button>
        <button
          type="button"
          disabled={pending === `remove-${id}`}
          onClick={() => run(`remove-${id}`, () => adminRemoveCommunityInfoEntry(community.id, kind, id), () => setConfirmingId(null))}
          className="rounded-md bg-coral px-2 py-1 text-xs font-medium text-cream disabled:opacity-50"
        >
          Confirm remove
        </button>
      </span>
    );
  }

  return (
    <section className="flex flex-col gap-5 rounded-lg border border-ink/10 p-4">
      <div>
        <h2 className="text-lg font-semibold text-ink">
          {community.displayName}
          {community.status === "demo" && <span className="ml-2 text-xs font-medium text-coral">fictional demo</span>}
        </h2>
        <p className="text-xs text-slate">
          Shown publicly on the Contacts page. Only add what you checked yourself against a real source.
        </p>
      </div>

      <p
        className={`rounded-md p-2 text-sm ${needsReview.length > 0 ? "bg-status-review text-ink" : "bg-status-resolved text-ink"}`}
      >
        {needsReview.length > 0
          ? `Needs review: ${needsReview.length} ${needsReview.length === 1 ? "entry is" : "entries are"} unverified or older than 6 months. They are listed first below.`
          : contacts.length + sources.length === 0
            ? "No contacts or sources yet."
            : "All entries were checked within the last 6 months."}
      </p>

      {message && (
        <p role="alert" className="rounded-md bg-coral/10 p-2 text-sm text-coral">
          {message}
        </p>
      )}

      {/* Official contacts */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-ink">Official contacts ({community.officialContacts.length})</h3>
        <ul className="flex flex-col gap-1">
          {contacts.map((c) => (
            <li key={c.id} className="flex flex-col gap-2 rounded-md border border-ink/10 p-2 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
                    {c.nameEs ?? c.name}
                    <FreshnessBadge state={sourceFreshness(c).state} language="en" />
                  </p>
                  <p className="break-words text-xs text-slate">
                    {[c.phone && `${c.channel === "whatsapp" ? "WhatsApp" : "Phone"} ${c.phone}`, c.isEmergencyService && "emergency", `checked ${c.lastVerifiedAt ?? "never"}`, c.sourceUrl && `source ${c.sourceUrl}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {c.verificationNote && <p className="text-xs text-slate">{c.verificationNote}</p>}
                </div>
                {removeButton("contact", c.id)}
              </div>
              {reverifyButton("contact", c.id, !!c.sourceUrl)}
            </li>
          ))}
        </ul>
        <form
          className="flex flex-col gap-2 rounded-md bg-mint/20 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            run("contact", () => adminAddOfficialContact(community.id, contact), () => setContact({ ...EMPTY_CONTACT, lastVerifiedAt: today() }));
          }}
        >
          <p className="text-xs font-semibold text-ink">Add a contact</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input required value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} aria-label="Name (English)" placeholder="Name (English)" className={input} />
            <input value={contact.nameEs} onChange={(e) => setContact({ ...contact, nameEs: e.target.value })} aria-label="Name (Spanish, optional)" placeholder="Nombre (español, opcional)" className={input} />
            <input value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} aria-label="Phone number" placeholder="Phone, e.g. +507 6000-0000" className={input} />
            <select value={contact.channel} onChange={(e) => setContact({ ...contact, channel: e.target.value as "phone" | "whatsapp" })} aria-label="How the number is reached" className={input}>
              <option value="phone">Phone call</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
            <input value={contact.url} onChange={(e) => setContact({ ...contact, url: e.target.value })} aria-label="Website (optional)" placeholder="Website https://… (optional)" className={input} />
            <input value={contact.sourceUrl} onChange={(e) => setContact({ ...contact, sourceUrl: e.target.value })} aria-label="Source URL where you checked it" placeholder="Source URL where you checked it" className={input} />
            <label className="flex items-center gap-2 text-xs text-ink">
              Checked on
              <input type="date" value={contact.lastVerifiedAt} max={today()} onChange={(e) => setContact({ ...contact, lastVerifiedAt: e.target.value })} className={input} />
            </label>
            <input value={contact.verificationNote} maxLength={300} onChange={(e) => setContact({ ...contact, verificationNote: e.target.value })} aria-label="Verification note (optional, public)" placeholder="What exactly the source says (optional, public)" className={input} />
            <div className="flex flex-wrap items-center gap-3 text-xs text-ink">
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={contact.isEmergencyService} onChange={(e) => setContact({ ...contact, isEmergencyService: e.target.checked })} />
                Emergency service
              </label>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={contact.verified} onChange={(e) => setContact({ ...contact, verified: e.target.checked })} />
                Verified (needs source + date)
              </label>
            </div>
          </div>
          <button type="submit" disabled={pending === "contact"} className="w-max rounded-md bg-teal px-3 py-1.5 text-sm font-medium text-cream disabled:opacity-50">
            Add contact
          </button>
        </form>
      </div>

      {/* Approved sources */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-ink">Approved sources ({community.trustedSources.length})</h3>
        <ul className="flex flex-col gap-1">
          {sources.map((s) => (
            <li key={s.id} className="flex flex-col gap-2 rounded-md border border-ink/10 p-2 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
                    {s.name}
                    <FreshnessBadge state={sourceFreshness(s).state} language="en" />
                  </p>
                  <p className="break-words text-xs text-slate">
                    {s.url} · {s.trustLevel === "official_verified" ? "official" : "community trusted"} · checked {s.lastVerifiedAt ?? "never"}
                  </p>
                  {s.verificationNote && <p className="text-xs text-slate">{s.verificationNote}</p>}
                </div>
                {removeButton("source", s.id)}
              </div>
              {reverifyButton("source", s.id, true)}
            </li>
          ))}
        </ul>
        <form
          className="flex flex-col gap-2 rounded-md bg-mint/20 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            run("source", () => adminAddTrustedSource(community.id, source), () => setSource({ ...EMPTY_SOURCE, lastVerifiedAt: today() }));
          }}
        >
          <p className="text-xs font-semibold text-ink">Add a source</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input required value={source.name} onChange={(e) => setSource({ ...source, name: e.target.value })} aria-label="Source name" placeholder="Source name" className={input} />
            <input required value={source.url} onChange={(e) => setSource({ ...source, url: e.target.value })} aria-label="Source URL" placeholder="https://…" className={input} />
            <select value={source.trustLevel} onChange={(e) => setSource({ ...source, trustLevel: e.target.value as typeof source.trustLevel })} aria-label="Trust level" className={input}>
              <option value="official_verified">Official source</option>
              <option value="community_trusted">Trusted by the community</option>
            </select>
            <label className="flex items-center gap-2 text-xs text-ink">
              Checked on
              <input type="date" required value={source.lastVerifiedAt} max={today()} onChange={(e) => setSource({ ...source, lastVerifiedAt: e.target.value })} className={input} />
            </label>
            <input value={source.verificationNote} maxLength={300} onChange={(e) => setSource({ ...source, verificationNote: e.target.value })} aria-label="Verification note (optional, public)" placeholder="What you checked on the source (optional, public)" className={`${input} sm:col-span-2`} />
          </div>
          <button type="submit" disabled={pending === "source"} className="w-max rounded-md bg-teal px-3 py-1.5 text-sm font-medium text-cream disabled:opacity-50">
            Add source
          </button>
        </form>
      </div>
    </section>
  );
}
