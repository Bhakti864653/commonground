import { isAdminAuthenticated } from "@/lib/admin/auth";
import { adminListCommunities, adminListCommunityInfoLog } from "@/lib/store/admin-community-actions";
import { CommunityInfoManager } from "@/components/admin/CommunityInfoManager";

export default async function AdminSourcesPage() {
  // Same page-level guard as admin/page.tsx — the layout's check alone doesn't stop this page
  // from running.
  if (!(await isAdminAuthenticated())) return null;

  const [communities, log] = await Promise.all([adminListCommunities(), adminListCommunityInfoLog()]);
  const nameOf = new Map(communities.map((c) => [c.id, c.displayName]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Sources and contacts</h1>
        <p className="mt-1 text-sm text-slate">
          What residents see on the public Contacts page. Changes made here live in the same
          temporary prototype store as cases: they are lost on a restart or redeploy, while the
          built-in entries (checked 2026-09-25) always come back.
        </p>
      </div>

      {communities.map((c) => (
        <CommunityInfoManager key={c.id} community={c} />
      ))}

      <section className="rounded-lg border border-ink/10 p-4">
        <h2 className="text-sm font-semibold text-ink">Change history</h2>
        {log.length === 0 ? (
          <p className="mt-1 text-sm text-slate">No changes yet.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {log.map((entry) => (
              <li key={entry.id} className="text-ink/80">
                <span className="font-medium text-ink">{entry.action}</span> “{entry.detail}” in{" "}
                {nameOf.get(entry.communityId) ?? entry.communityId} by {entry.actorId} —{" "}
                {new Date(entry.occurredAt).toLocaleString()}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
