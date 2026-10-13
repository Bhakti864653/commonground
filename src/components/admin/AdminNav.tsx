"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** The four places a moderator goes. Everything else lives under Settings. */
export const ADMIN_NAV = [
  { href: "/admin/pipeline", label: "Home", matches: (p: string) => p === "/admin/pipeline" },
  { href: "/admin", label: "All cases", matches: (p: string) => p === "/admin" || p.startsWith("/admin/cases/") },
  { href: "/demo/office", label: "Demo office", matches: (p: string) => p.startsWith("/demo/office") },
  {
    href: "/admin/settings",
    label: "Settings",
    matches: (p: string) => ["/admin/settings", "/admin/communities", "/admin/sources", "/admin/moderators", "/admin/offices"].some((s) => p.startsWith(s)),
  },
] as const;

export function AdminNav() {
  const pathname = usePathname() ?? "";
  return (
    <nav aria-label="Admin" className="flex flex-wrap items-center gap-1 text-sm font-semibold">
      {ADMIN_NAV.map((item) => {
        const active = item.matches(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-3 py-1.5 ${active ? "bg-ink text-cream" : "text-ink hover:bg-mint"}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** "← Back to Pipeline" on every moderator screen except Home itself. */
export function BackToPipeline() {
  const pathname = usePathname() ?? "";
  if (pathname === "/admin/pipeline") return null;
  return (
    <Link href="/admin/pipeline" className="inline-flex w-max items-center gap-1 text-sm font-semibold text-teal underline">
      ← Back to Pipeline
    </Link>
  );
}
