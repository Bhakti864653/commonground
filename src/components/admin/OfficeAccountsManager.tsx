"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { disableOfficeAccountAction, inviteOfficeAccountAction } from "@/lib/office/actions";
import type { OfficeAccount } from "@/lib/office/types";
import type { PipelineResult } from "@/lib/pipeline/pipeline";

/** Invite-only office accounts: the owner adds an email for one office, or disables it. */
export function OfficeAccountsManager({ accounts, offices }: { accounts: OfficeAccount[]; offices: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [officeId, setOfficeId] = useState(offices[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const officeName = (id: string) => offices.find((o) => o.id === id)?.name ?? id;
  async function act(fn: () => Promise<PipelineResult>) {
    setBusy(true);
    const res = await fn();
    setResult(res);
    if (res.ok) {
      setEmail("");
      setName("");
    }
    setBusy(false);
    router.refresh();
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-0 flex-col text-xs text-slate">
          Email (their Google account)
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="rounded-md border border-ink/15 bg-cream px-2 py-1.5 text-sm text-ink" />
        </label>
        <label className="flex min-w-0 flex-col text-xs text-slate">
          Name (optional)
          <input value={name} onChange={(e) => setName(e.target.value)} className="rounded-md border border-ink/15 bg-cream px-2 py-1.5 text-sm text-ink" />
        </label>
        <label className="flex max-w-full flex-col text-xs text-slate">
          Office
          <select value={officeId} onChange={(e) => setOfficeId(e.target.value)} className="max-w-full rounded-md border border-ink/15 bg-cream px-2 py-1.5 text-sm text-ink">
            {offices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <button type="button" disabled={busy || !email.trim()} onClick={() => act(() => inviteOfficeAccountAction({ email, name, officeId }))} className="rounded-md bg-teal px-3 py-1.5 text-sm font-medium text-cream disabled:opacity-50">
          Invite
        </button>
      </div>
      {result && <p role="status" className={`text-sm ${result.ok ? "text-teal" : "text-coral"}`}>{result.ok ? `✓ ${result.message}` : `✗ ${result.reason}`}</p>}
      {accounts.length === 0 ? (
        <p className="text-sm text-slate">No office accounts yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {accounts.map((a) => (
            <li key={a.email} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink/10 p-3 text-sm">
              <span className="min-w-0 break-all">
                <span className="font-medium text-ink">{a.email}</span> · {officeName(a.officeId)}
                {a.disabledAt && <span className="ml-2 text-xs text-coral">disabled</span>}
              </span>
              {!a.disabledAt && (
                <button type="button" disabled={busy} onClick={() => act(() => disableOfficeAccountAction(a.email))} className="rounded-md border border-coral/50 px-2 py-1 text-xs font-medium text-coral">
                  Disable
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
