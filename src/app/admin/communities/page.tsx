import { isAdminAuthenticated } from "@/lib/admin/auth";
import { adminListCommunities, adminListCommunityRequests } from "@/lib/store/admin-community-actions";
import { casePrefix } from "@/lib/case-number/format-case-number";
import { CreateCommunityForm } from "@/components/admin/CreateCommunityForm";
import { usesDatabase } from "@/lib/db/storage-mode";
import { AdoptStarterButton } from "@/components/admin/AdoptStarterButton";
import { DeleteCommunityButton } from "@/components/admin/DeleteCommunityButton";
import { listCasesForAdmin } from "@/lib/store/admin-actions";
import { isBuiltInCommunity } from "@/lib/store/community-store";

export default async function AdminCommunitiesPage() {
  // Same page-level guard as admin/page.tsx — the layout's check alone can't stop this page
  // from running.
  if (!(await isAdminAuthenticated())) return null;
  const [communities, requests, cases] = await Promise.all([
    adminListCommunities(),
    adminListCommunityRequests(),
    listCasesForAdmin(),
  ]);
  const caseCount = new Map<string, number>();
  for (const c of cases) caseCount.set(c.communityId, (caseCount.get(c.communityId) ?? 0) + 1);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="text-3xl text-ink">Communities</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate">
          Every community residents can choose in the place selector. A community you set up here gets its own
          areas, categories, and case-number prefix, and works everywhere: map, Explore, submissions, the Guide, and
          moderation. Communities &ldquo;started by a visitor&rdquo; were created automatically when someone added
          a place; they accept reports but say they are not reviewed until you mark them reviewed.
        </p>
        <ul className="mt-5 divide-y divide-line rounded-[20px] bg-surface">
          {communities.map((c) => (
            <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-4">
              <span>
                <span className="font-semibold text-ink">{c.displayName}</span>
                <span className="ml-2 text-sm text-slate">
                  {c.region ? `${c.region}, ` : ""}
                  {c.country}
                </span>
              </span>
              <span className="text-sm text-slate">
                {c.areas.length} areas · {c.categories.length} categories · case numbers{" "}
                <span className="font-mono text-ink">{casePrefix(c.id)}-YYYY-0001</span>
                {c.status === "demo" ? " · fictional demo" : ""}
                {c.status === "starter" && (
                  <>
                    {" · "}
                    <span className="font-semibold text-coral">started by a visitor, not reviewed</span>{" "}
                    <AdoptStarterButton id={c.id} />
                  </>
                )}
                {!isBuiltInCommunity(c.id) &&
                  ((caseCount.get(c.id) ?? 0) > 0 ? (
                    <span className="ml-2 text-xs">
                      · {caseCount.get(c.id)} {caseCount.get(c.id) === 1 ? "case" : "cases"}, so it can&rsquo;t be deleted
                    </span>
                  ) : (
                    <>
                      {" "}
                      <DeleteCommunityButton id={c.id} name={c.displayName} />
                    </>
                  ))}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-2xl text-ink">Requests from visitors</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate">
          Places people asked for from the &ldquo;not set up yet&rdquo; screen, most-requested first. Requests are
          anonymous (no contact details are collected), so nobody can be replied to.{" "}
          {usesDatabase() ? "Saved in the database, like cases." : "Kept only in server memory on this server (no DATABASE_URL), so they can disappear."}
        </p>
        {requests.length === 0 ? (
          <p className="mt-4 text-sm text-slate">No requests yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line rounded-[20px] bg-surface">
            {requests.map((r) => (
              <li key={r.placeName} className="flex flex-col gap-1 px-5 py-4">
                <span className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <span className="font-semibold text-ink">
                    {r.placeName}
                    {r.parts && (
                      <span className="ml-2 text-xs font-normal text-slate">
                        {[
                          r.parts.neighborhood && `neighborhood: ${r.parts.neighborhood}`,
                          `city: ${r.parts.city}`,
                          r.parts.region && `region: ${r.parts.region}`,
                          `country: ${r.parts.country}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    )}
                  </span>
                  <span className="text-sm text-slate">
                    {r.count} {r.count === 1 ? "request" : "requests"} · latest {new Date(r.latestAt).toLocaleDateString()}
                  </span>
                </span>
                {r.notes.length > 0 && (
                  <ul className="list-disc pl-5 text-sm text-ink/80">
                    {r.notes.map((note, i) => (
                      <li key={i} className="break-words">
                        {note}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      <CreateCommunityForm persistent={usesDatabase()} />
    </div>
  );
}
