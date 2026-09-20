import Link from "next/link";
import { listCasesForAdmin } from "@/lib/store/admin-actions";
import { getCommunityById } from "@/data/communities";
import { STATUS_LABELS, VERIFICATION_LABELS } from "@/lib/schema/report";

export default async function AdminPage() {
  const cases = await listCasesForAdmin();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-ink">All cases</h1>
      {cases.length === 0 ? (
        <p className="text-sm text-slate">No cases yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {cases.map((c) => {
            const community = getCommunityById(c.communityId);
            const flagCount = c.inaccuracyFlags.filter((f) => !f.reviewedAt).length;
            return (
              <Link
                key={c.id}
                href={`/admin/cases/${c.publicCaseNumber}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-ink/10 p-3 text-sm hover:bg-mint/20"
              >
                <div>
                  <p className="font-medium text-ink">
                    {c.publicCaseNumber}
                    {c.isDuplicateOf && (
                      <span className="ml-2 text-xs font-normal text-slate">
                        dup of {c.isDuplicateOf}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate">
                    {community?.displayName} · {c.type} · {STATUS_LABELS[c.status].en} ·{" "}
                    {VERIFICATION_LABELS[c.verificationState].en}
                  </p>
                </div>
                {flagCount > 0 && (
                  <span className="shrink-0 rounded-full bg-coral/15 px-2 py-0.5 text-xs font-medium text-coral">
                    {flagCount} flag{flagCount > 1 ? "s" : ""}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
