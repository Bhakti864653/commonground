import Link from "next/link";
import { getCurrentModerator } from "@/lib/admin/auth";

/** The setup screens a moderator rarely needs, each with one plain sentence. */
export const SETTINGS_LINKS = [
  { href: "/admin/communities", label: "Communities", about: "The places CommonGround covers, and requests from visitors to add a new one.", ownerOnly: false },
  { href: "/admin/sources", label: "Sources & contacts", about: "The official sources and public contacts the Guide is allowed to mention.", ownerOnly: false },
  { href: "/admin/moderators", label: "Moderators", about: "Who can sign in here. Only the owner can add or remove people.", ownerOnly: true },
  { href: "/admin/offices", label: "Offices", about: "Office accounts for the real office portal, which is switched off.", ownerOnly: true },
] as const;

export default async function AdminSettingsPage() {
  // Page-level guard, like every admin page.
  const me = await getCurrentModerator();
  if (!me) return null;
  const links = SETTINGS_LINKS.filter((l) => !l.ownerOnly || me.role === "owner");
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-ink">Settings</h1>
        <p className="mt-1 text-sm text-slate">Setup screens you rarely need. Day-to-day work happens on Home.</p>
      </div>
      <ul className="flex flex-col gap-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="flex flex-col gap-0.5 rounded-lg border border-ink/10 p-3 hover:bg-mint/20">
              <span className="text-sm font-semibold text-teal underline">{l.label}</span>
              <span className="text-sm text-ink/80">{l.about}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
