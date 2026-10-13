import { getCurrentOffice, isOfficePortalEnabled } from "@/lib/office/auth";
import { officeInboxAction, officeSignOutAction } from "@/lib/office/actions";
import { getReferralOffice } from "@/data/referral-offices";
import { OfficeInbox } from "@/components/office/OfficeInbox";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const LOGIN_PROBLEMS: Record<string, string> = {
  disabled: "The office portal is not enabled.",
  unavailable: "Sign-in isn't available right now.",
  cancelled: "Sign-in was cancelled.",
  failed: "Sign-in didn't work. Please try again.",
  not_invited: "This Google account hasn't been invited as an office account.",
};

/**
 * The real office portal. OFF until OFFICE_PORTAL_ENABLED is "true" (docs/GO_LIVE_CHECKLIST.md):
 * while off, this page only says so — there is no sign-in button and every action refuses.
 */
export default async function OfficePortalPage({ searchParams }: { searchParams: Promise<{ login?: string }> }) {
  const { login } = await searchParams;
  if (!isOfficePortalEnabled()) {
    return (
      <main className="mx-auto max-w-xl px-4 py-12 text-ink">
        <h1 className="text-xl font-semibold">CommonGround office portal</h1>
        <p className="mt-2 text-sm text-slate">
          The office portal is not enabled. CommonGround is a student demo and does not send cases to any office.
        </p>
      </main>
    );
  }
  const office = await getCurrentOffice();
  if (!office) {
    return (
      <main className="mx-auto max-w-xl px-4 py-12 text-ink">
        <h1 className="text-xl font-semibold">CommonGround office portal</h1>
        <p className="mt-2 text-sm text-slate">For invited office accounts only. There is no sign-up.</p>
        {login && LOGIN_PROBLEMS[login] && <p className="mt-3 text-sm text-coral">{LOGIN_PROBLEMS[login]}</p>}
        <a href="/api/auth/office/google" className="mt-4 inline-block rounded-md bg-teal px-4 py-2 text-sm font-semibold text-cream">
          Sign in with Google
        </a>
      </main>
    );
  }
  const referrals = await officeInboxAction();
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-5 px-4 py-6 text-ink">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs text-slate">Office portal · {office.email}</p>
          <h1 className="text-xl font-semibold">{getReferralOffice(office.officeId)?.name}</h1>
        </div>
        <form action={officeSignOutAction}>
          <button className="rounded-md border border-ink/15 px-3 py-1.5 text-sm font-medium">Sign out</button>
        </form>
      </div>
      <OfficeInbox mode="real" officeId={office.officeId} referrals={referrals} />
    </main>
  );
}
