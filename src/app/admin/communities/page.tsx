import { isAdminAuthenticated } from "@/lib/admin/auth";
import { adminListCommunities } from "@/lib/store/admin-community-actions";
import { casePrefix } from "@/lib/case-number/format-case-number";
import { CreateCommunityForm } from "@/components/admin/CreateCommunityForm";

export default async function AdminCommunitiesPage() {
  // Same page-level guard as admin/page.tsx — the layout's check alone can't stop this page
  // from running.
  if (!(await isAdminAuthenticated())) return null;
  const communities = await adminListCommunities();

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="text-3xl text-ink">Communities</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate">
          Every community residents can choose in the place selector. A community you set up here gets its own
          areas, categories, and case-number prefix, and works everywhere: map, Explore, submissions, the Guide, and
          moderation.
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
              </span>
            </li>
          ))}
        </ul>
      </section>
      <CreateCommunityForm />
    </div>
  );
}
