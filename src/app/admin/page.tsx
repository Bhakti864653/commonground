import Link from "next/link";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { getAdminDuplicateClusters, listCasesForAdmin } from "@/lib/store/admin-actions";
import { listCommunities } from "@/lib/store/community-store";
import { STATUS_LABELS, VERIFICATION_LABELS } from "@/lib/schema/report";
import { DuplicateClusterCard } from "@/components/admin/DuplicateClusterCard";
import { BriefingPanel } from "@/components/admin/BriefingPanel";
import { isDemoGuideOn, onlyExamples } from "@/lib/demo-guide/demo-mode";

export default async function AdminPage() {
  // The layout's own auth check does NOT stop this page from being invoked to produce its
  // `children` value — Next.js renders a page and the layout it's nested in as one pass, so a
  // parent's conditional can't skip a child that already ran. Every protected page needs its
  // own guard, checked before any protected data fetch, not just the layout's UI swap.
  if (!(await isAdminAuthenticated())) return null;

  const [allCases, allClusters, communityList, demoOn] = await Promise.all([
    listCasesForAdmin(),
    getAdminDuplicateClusters(),
    listCommunities(),
    isDemoGuideOn(),
  ]);
  // While the demo guide is on, only example cases (see demo-mode.ts), and no AI briefing, which
  // could mention any case.
  const cases = onlyExamples(allCases, (c) => c.sourceType === "demonstration", demoOn);
  const exampleNumbers = new Set(allCases.filter((c) => c.sourceType === "demonstration").map((c) => c.publicCaseNumber));
  const clusters = onlyExamples(allClusters, (cl) => cl.caseNumbers.every((n) => exampleNumbers.has(n)), demoOn);
  const hiddenResidentCases = allCases.length - cases.length;
  const communities = new Map(communityList.map((c) => [c.id, c]));
  const getCommunityById = (id: string) => communities.get(id);
  const caseByNumber = new Map(cases.map((c) => [c.publicCaseNumber, c]));
  const communityIds = [...new Set(cases.map((c) => c.communityId))];

  return (
    <div className="flex flex-col gap-6">
      {hiddenResidentCases > 0 && (
        <p role="note" className="rounded-md border border-[#f5c542] bg-[#f5c542]/10 px-3 py-2 text-sm text-ink">
          Demo guide is on: {hiddenResidentCases} resident report{hiddenResidentCases === 1 ? " is" : "s are"} hidden, so only example cases show. Exit the guide
          to see {hiddenResidentCases === 1 ? "it" : "them"}.
        </p>
      )}

      {!demoOn && communityIds.length > 0 && (
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
        <div>
          <h1 className="text-xl font-semibold text-ink">All cases</h1>
          <p className="mt-1 text-sm text-slate">Every report, newest first. Example cases are labelled; the rest are real residents’ reports.</p>
        </div>
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
                      {c.sourceType === "demonstration" && <span className="ml-2 text-xs font-normal text-slate">example</span>}
                      {c.isDuplicateOf && (
                        <span className="ml-2 text-xs font-normal text-slate">
                          dup of {c.isDuplicateOf}
                        </span>
                      )}
                      {c.removal && (
                        <span className="ml-2 text-xs font-normal text-coral">content removed</span>
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
