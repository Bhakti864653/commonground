"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminAddNote,
  adminChangeStatus,
  adminMarkDuplicate,
  adminReviewInaccuracyFlag,
  adminSetVerification,
} from "@/lib/store/admin-actions";
import {
  ReportStatusSchema,
  STATUS_LABELS,
  VERIFICATION_LABELS,
  VerificationStateSchema,
  type Case,
} from "@/lib/schema/report";

const STATUS_OPTIONS = ReportStatusSchema.options;
const VERIFICATION_OPTIONS = VerificationStateSchema.options;

export function ModerationPanel({
  caseData,
  communityDisplayName,
  categoryLabel,
}: {
  caseData: Case;
  communityDisplayName: string;
  categoryLabel: string;
}) {
  const router = useRouter();
  const [statusNote, setStatusNote] = useState("");
  const [duplicateOf, setDuplicateOf] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  async function run(key: string, fn: () => Promise<boolean>) {
    setPending(key);
    await fn();
    setPending(null);
    router.refresh();
  }

  const openFlags = caseData.inaccuracyFlags.filter((f) => !f.reviewedAt);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-slate">{communityDisplayName}</p>
        <h1 className="text-xl font-semibold text-ink">{caseData.publicCaseNumber}</h1>
        <p className="mt-1 text-sm text-ink/80">{categoryLabel}</p>
        <p className="mt-2 whitespace-pre-wrap text-sm text-ink/80">{caseData.description}</p>
        {caseData.isDuplicateOf && (
          <p className="mt-2 text-xs font-medium text-coral">
            Marked as duplicate of {caseData.isDuplicateOf}
          </p>
        )}
      </div>

      {/* Status */}
      <section className="rounded-lg border border-ink/10 p-4">
        <h2 className="text-sm font-semibold text-ink">
          Status <span className="text-slate">({STATUS_LABELS[caseData.status].en})</span>
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            id="status-select"
            defaultValue={caseData.status}
            className="rounded-md border border-ink/15 bg-cream px-2 py-1.5 text-sm text-ink"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s].en}
              </option>
            ))}
          </select>
          <input
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
            placeholder="Note shown in the resident's status history (optional)"
            className="min-w-[16rem] flex-1 rounded-md border border-ink/15 bg-cream px-2 py-1.5 text-sm text-ink"
          />
          <button
            type="button"
            disabled={pending === "status"}
            onClick={() => {
              const select = document.getElementById("status-select") as HTMLSelectElement;
              run("status", () =>
                adminChangeStatus(
                  caseData.publicCaseNumber,
                  select.value as Case["status"],
                  statusNote || undefined,
                ),
              );
            }}
            className="rounded-md bg-teal px-3 py-1.5 text-sm font-medium text-cream disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      </section>

      {/* Verification */}
      <section className="rounded-lg border border-ink/10 p-4">
        <h2 className="text-sm font-semibold text-ink">
          Verification{" "}
          <span className="text-slate">({VERIFICATION_LABELS[caseData.verificationState].en})</span>
        </h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {VERIFICATION_OPTIONS.map((v) => (
            <button
              key={v}
              type="button"
              disabled={pending === "verify" || v === caseData.verificationState}
              onClick={() => run("verify", () => adminSetVerification(caseData.publicCaseNumber, v))}
              className={`rounded-full px-3 py-1.5 text-sm font-medium disabled:opacity-40 ${
                v === caseData.verificationState
                  ? "bg-teal text-cream"
                  : "border border-ink/15 text-ink"
              }`}
            >
              {VERIFICATION_LABELS[v].en}
            </button>
          ))}
        </div>
      </section>

      {/* Duplicate marking */}
      <section className="rounded-lg border border-ink/10 p-4">
        <h2 className="text-sm font-semibold text-ink">Mark as duplicate</h2>
        <div className="mt-2 flex gap-2">
          <input
            value={duplicateOf}
            onChange={(e) => setDuplicateOf(e.target.value)}
            placeholder="Original case number, e.g. SV-2026-0001"
            className="flex-1 rounded-md border border-ink/15 bg-cream px-2 py-1.5 text-sm text-ink"
          />
          <button
            type="button"
            disabled={pending === "duplicate" || !duplicateOf.trim()}
            onClick={() =>
              run("duplicate", async () => {
                const ok = await adminMarkDuplicate(caseData.publicCaseNumber, duplicateOf.trim());
                if (ok) setDuplicateOf("");
                return ok;
              })
            }
            className="shrink-0 rounded-md bg-teal px-3 py-1.5 text-sm font-medium text-cream disabled:opacity-50"
          >
            Mark duplicate
          </button>
        </div>
      </section>

      {/* Inaccuracy flag queue */}
      <section className="rounded-lg border border-ink/10 p-4">
        <h2 className="text-sm font-semibold text-ink">
          Inaccuracy flags {openFlags.length > 0 && `(${openFlags.length} open)`}
        </h2>
        {caseData.inaccuracyFlags.length === 0 ? (
          <p className="mt-1 text-sm text-slate">None.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {caseData.inaccuracyFlags.map((flag) => (
              <li
                key={flag.id}
                className={`flex items-start justify-between gap-2 rounded-md border p-2 text-sm ${
                  flag.reviewedAt ? "border-ink/10 text-slate" : "border-coral/30"
                }`}
              >
                <div>
                  <p>{flag.note || "(no note)"}</p>
                  <p className="text-xs text-slate">
                    {new Date(flag.occurredAt).toLocaleString()}
                    {flag.reviewedAt && " · reviewed"}
                  </p>
                </div>
                {!flag.reviewedAt && (
                  <button
                    type="button"
                    disabled={pending === `flag-${flag.id}`}
                    onClick={() =>
                      run(`flag-${flag.id}`, () =>
                        adminReviewInaccuracyFlag(caseData.publicCaseNumber, flag.id),
                      )
                    }
                    className="shrink-0 rounded-md border border-ink/15 px-2 py-1 text-xs font-medium text-ink"
                  >
                    Mark reviewed
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Private notes */}
      <section className="rounded-lg border border-ink/10 p-4">
        <h2 className="text-sm font-semibold text-ink">Private notes</h2>
        {caseData.adminNotes.length > 0 && (
          <ul className="mt-2 flex flex-col gap-2">
            {caseData.adminNotes.map((n) => (
              <li key={n.id} className="rounded-md bg-mint/30 p-2 text-sm">
                <p>{n.note}</p>
                <p className="text-xs text-slate">
                  {n.authorId} · {new Date(n.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-2 flex gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a private note (never shown publicly)"
            className="flex-1 rounded-md border border-ink/15 bg-cream px-2 py-1.5 text-sm text-ink"
          />
          <button
            type="button"
            disabled={pending === "note" || !note.trim()}
            onClick={() =>
              run("note", async () => {
                const ok = await adminAddNote(caseData.publicCaseNumber, note);
                if (ok) setNote("");
                return ok;
              })
            }
            className="shrink-0 rounded-md bg-teal px-3 py-1.5 text-sm font-medium text-cream disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </section>

      {/* Moderation history */}
      <section className="rounded-lg border border-ink/10 p-4">
        <h2 className="text-sm font-semibold text-ink">Moderation history</h2>
        {caseData.moderationActions.length === 0 ? (
          <p className="mt-1 text-sm text-slate">No moderator actions yet.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {caseData.moderationActions
              .slice()
              .reverse()
              .map((a) => (
                <li key={a.id} className="text-ink/80">
                  <span className="font-medium text-ink">{a.action}</span> by {a.actorId} —{" "}
                  {new Date(a.occurredAt).toLocaleString()}
                  {a.detail && <span className="text-slate"> ({a.detail})</span>}
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}
