import { getCurrentModerator, ownerEmail } from "@/lib/admin/auth";
import { adminListModerators } from "@/lib/admin/moderator-actions";
import { usesDatabase } from "@/lib/db/storage-mode";
import { AddModeratorForm, RemoveModeratorButton } from "@/components/admin/ModeratorManager";

const dateFormat = (iso: string) => new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

export default async function AdminModeratorsPage() {
  // Page-level guard, like every admin page — and this one is the owner's only.
  const me = await getCurrentModerator();
  if (!me) return null;
  if (me.role !== "owner") {
    return <p className="text-sm text-ink">Only the owner can add or remove moderators.</p>;
  }
  const moderators = await adminListModerators();
  const owner = ownerEmail();

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="text-3xl text-ink">Moderators</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate">
          People who can sign in here with Google. Each one&rsquo;s approvals, status changes and notes are recorded
          under their email. Removing someone signs them out right away. Residents never need an account.
        </p>
        {!owner && (
          <p className="mt-3 max-w-2xl rounded-md border border-coral/40 bg-coral/5 px-3 py-2 text-sm text-ink">
            OWNER_EMAIL isn&rsquo;t set on this server, so nobody can sign in as the owner with Google yet.
          </p>
        )}
        {!usesDatabase() && (
          <p className="mt-3 max-w-2xl text-sm text-slate">
            Kept only in server memory on this server (no DATABASE_URL), so this list and sign-ins can disappear.
          </p>
        )}
        <ul className="mt-5 divide-y divide-line rounded-[20px] bg-surface">
          {moderators.length === 0 && <li className="px-5 py-4 text-sm text-slate">No one has signed in with Google yet.</li>}
          {moderators.map((m) => (
            <li key={m.email} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-4">
              <span>
                <span className="font-semibold text-ink">{m.name || m.email}</span>
                {m.name && <span className="ml-2 text-sm text-slate">{m.email}</span>}
                <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-slate">{m.role}</span>
              </span>
              <span className="flex items-center gap-3 text-xs text-slate">
                {m.role === "owner" ? "Set by OWNER_EMAIL" : `Added ${dateFormat(m.addedAt)} by ${m.addedBy}`}
                {m.role !== "owner" && <RemoveModeratorButton email={m.email} />}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-xl text-ink">Add a moderator</h2>
        <p className="mt-1 mb-3 max-w-2xl text-sm text-slate">
          Use the email of their Google account (a Gmail address, or a work or school account that uses Google).
        </p>
        <AddModeratorForm />
      </section>
    </div>
  );
}
