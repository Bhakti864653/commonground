import Link from "next/link";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { getAdminDuplicateClusters, listCasesForAdmin } from "@/lib/store/admin-actions";
import { getCommunityById } from "@/data/communities";
import { STATUS_LABELS, VERIFICATION_LABELS } from "@/lib/schema/report";
import { DuplicateClusterCard } from "@/components/admin/DuplicateClusterCard";
import { BriefingPanel } from "@/components/admin/BriefingPanel";

export default async function AdminPage() {
  // The layout's own auth check does NOT stop this page from being invoked to produce its
  // `children` value — Next.js renders a page and the layout it's nested in as one pass, so a
  // parent's conditional can't skip a child that already ran. Every protected page needs its
  // own guard, checked before any protected data fetch, not just the layout's UI swap.
  if (!(await isAdminAuthenticated())) return null;

  const [cases, clusters] = await Promise.all([listCasesForAdmin(), getAdminDuplicateClusters()]);
  const caseByNumber = new Map(cases.map((c) => [c.publicCaseNumber, c]));
  const communityIds = [...new Set(cases.map((c) => c.communityId))];

  return (
    <div className="flex flex-col gap-6">
      {communityIds.length > 0 && (
        <section className="flex flex-col gap-2">
          {communityIds.map((id) => (
            <BriefingPanel
              key={id}
              communityId={id}
              communityDisplayName={getCommunityById(id)?.displayName ?? id}
            />
          ))}
        </section>
      )}

      {clusters.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-ink">
            Possible duplicate clusters ({clusters.length})
          </h2>
          <p className="text-xs text-slate">
            Recomputed every time this page loads (rule-based word-overlap within the same
            category + area) — no cases changed until you click one of the buttons below.
          </p>
          {clusters.map((cluster) => {
            const community = getCommunityById(cluster.communityId);
            const category = community?.categories.find((c) => c.id === cluster.categoryId);
            const area = community?.areas.find((a) => a.id === cluster.areaId);
            const clusterCases = cluster.caseNumbers
              .map((n) => caseByNumber.get(n))
              .filter((c): c is NonNullable<typeof c> => !!c)
              .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
            if (clusterCases.length < 2) return null;
            return (
              <DuplicateClusterCard
                key={cluster.caseNumbers.join(",")}
                cases={clusterCases}
                communityDisplayName={community?.displayName ?? cluster.communityId}
                categoryLabel={category?.label ?? cluster.categoryId}
                areaLabel={area?.label ?? cluster.areaId ?? "no area"}
                score={cluster.score}
              />
            );
          })}
        </section>
      )}

      <section className="flex flex-col gap-4">
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
      </section>
    </div>
  );
}
