import { getCurrentModerator } from "@/lib/admin/auth";
import { listOfficeAccountsAction } from "@/lib/office/actions";
import { isOfficePortalEnabled } from "@/lib/office/auth";
import { REFERRAL_OFFICES } from "@/data/referral-offices";
import { OfficeAccountsManager } from "@/components/admin/OfficeAccountsManager";

/** Office accounts (owner only). Accounts can be prepared now; nobody can sign in until go-live. */
export default async function OfficeAccountsPage() {
  const moderator = await getCurrentModerator();
  if (!moderator) return null;
  if (moderator.role !== "owner") return <p className="text-sm text-slate">Only the owner can manage office accounts.</p>;
  const accounts = await listOfficeAccountsAction();
  const enabled = isOfficePortalEnabled();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-ink">Office accounts</h1>
      <p className={`rounded-md p-3 text-sm ${enabled ? "bg-mint/50 text-ink" : "bg-coral/10 text-coral"}`}>
        The office portal is <span className="font-semibold">{enabled ? "ON" : "OFF"}</span>.{" "}
        {enabled ? "Invited offices can sign in at /office." : "Nobody can sign in at /office until it is turned on — see docs/GO_LIVE_CHECKLIST.md."}
      </p>
      <p className="text-sm text-slate">Invite-only: there is no sign-up. Each account belongs to one office and only ever sees that office’s referrals.</p>
      <OfficeAccountsManager accounts={accounts} offices={REFERRAL_OFFICES.map((o) => ({ id: o.id, name: o.name }))} />
    </div>
  );
}
