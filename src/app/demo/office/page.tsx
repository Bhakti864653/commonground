import Link from "next/link";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { REFERRAL_OFFICES, getReferralOffice } from "@/data/referral-offices";
import { demoOfficeInboxAction } from "@/lib/office/actions";
import { OfficeInbox } from "@/components/office/OfficeInbox";
import { PUBLIC_SITE_HREF } from "@/components/admin/AdminNav";

// Moderator-only, per request: always rendered on demand, never prerendered.
export const dynamic = "force-dynamic";
// "Not our department" re-runs the Routing Agent; a public note runs the translator and Critic.
export const maxDuration = 120;

/**
 * The simulated office: a signed-in moderator acts as one of the example offices, on example
 * cases only, through the same inbox screen real offices would use. Nothing is ever sent.
 */
export default async function DemoOfficePage({ searchParams }: { searchParams: Promise<{ office?: string }> }) {
  if (!(await isAdminAuthenticated())) {
    return (
      <main className="mx-auto max-w-xl px-4 py-12 text-ink">
        <h1 className="text-xl font-semibold">Simulated office (demo)</h1>
        <p className="mt-2 text-sm text-slate">
          This page is for CommonGround moderators only.{" "}
          <Link href="/admin" className="font-semibold text-teal underline">
            Sign in as a moderator
          </Link>{" "}
          first.
        </p>
      </main>
    );
  }
  const { office } = await searchParams;
  const officeId = getReferralOffice(office ?? "")?.id ?? "lighting";
  const counts = await Promise.all(REFERRAL_OFFICES.map(async (o) => [o.id, (await demoOfficeInboxAction(o.id)).length] as const));
  const referrals = await demoOfficeInboxAction(officeId);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-5 px-4 py-6 text-ink">
      <div role="note" className="rounded-lg border-2 border-coral bg-coral/10 p-3 text-sm font-semibold text-coral">
        Simulated office – demo only, not a real government office. Only example cases appear here, and nothing is ever sent anywhere.
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs text-slate">Demo office: a pretend city office, so you can show the other side. Not a real office.</p>
          <h1 className="text-xl font-semibold">{getReferralOffice(officeId)?.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin/pipeline" className="text-sm font-semibold text-teal underline">
            ← Back to Pipeline
          </Link>
          <a href={PUBLIC_SITE_HREF} className="rounded-full border border-teal px-3 py-1 text-sm font-semibold text-teal">
            View public site →
          </a>
        </div>
      </div>
      <nav aria-label="Act as office" className="flex flex-wrap gap-2 text-sm">
        {REFERRAL_OFFICES.map((o) => {
          const count = counts.find(([id]) => id === o.id)?.[1] ?? 0;
          return (
            <Link
              key={o.id}
              href={`/demo/office?office=${o.id}`}
              aria-current={o.id === officeId ? "page" : undefined}
              className={`rounded-full border px-3 py-1 ${o.id === officeId ? "border-teal bg-teal text-cream" : "border-ink/15 text-ink"}`}
            >
              {o.name.replace(" (example office)", "")} ({count})
            </Link>
          );
        })}
      </nav>
      <p className="text-xs text-slate">
        This is the same inbox real offices would use once the office portal is turned on (it is OFF). Status changes appear on the public case page
        labelled “Simulated office”; public notes wait for a moderator; “Resolved” waits for a moderator to confirm.
      </p>
      <OfficeInbox mode="demo" officeId={officeId} referrals={referrals} />
    </main>
  );
}
